#!/usr/bin/env node
// Renders an artifact page at desktop and phone width and reports the layout defects a reader
// would see. Exits 1 on any finding and writes a full-page screenshot per width.
//
// Usage:
//   node <this skill's directory>/checkArtifact.ts <artifact.html> [--out <dir>]

import { execFileSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, extname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import type { Browser, BrowserType, Page } from "playwright"

const DEFAULT_OUT_SUBDIR = ".repo/local/tmp/artifact-check"
const VIEWPORT_WIDTHS = [1280, 390]
const VIEWPORT_HEIGHT = 900
const LABEL_INSET_PX = 2

type Finding = { kind: string; detail: string }

// A connector whose path runs through a label. Diagram tools often paint an opaque plate under an
// edge label, so geometry can't tell a hidden crossing from a visible one. The pixels decide.
type CrossingCandidate = { connectorIndex: number; textIndex: number; detail: string }

const CONNECTOR_SELECTOR = "svg path, svg line, svg polyline"
const TEXT_SELECTOR = "svg text"

// Playwright serializes this function into the page, so every helper has to live inside it.
// Everything compares client pixels, which makes viewBox scaling and transforms irrelevant.
const findDefects = ({
  connectorSelector,
  textSelector,
  labelInset,
}: {
  connectorSelector: string
  textSelector: string
  labelInset: number
}) => {
  const SLACK_PX = 1
  const SAMPLE_STEP_PX = 2
  // Stacked lines with tight leading touch at the edges of their em boxes. Text drawn over text
  // shares most of its height.
  const MIN_OVERLAP_SHARE = 0.5
  const describe = (element: Element) => `"${(element.textContent ?? "").trim().slice(0, 60)}"`
  const containsRect = (outer: DOMRect, inner: DOMRect) =>
    inner.left >= outer.left - SLACK_PX &&
    inner.right <= outer.right + SLACK_PX &&
    inner.top >= outer.top - SLACK_PX &&
    inner.bottom <= outer.bottom + SLACK_PX
  const intersects = (a: DOMRect, b: DOMRect) =>
    a.left < b.right - SLACK_PX &&
    b.left < a.right - SLACK_PX &&
    a.top < b.bottom - SLACK_PX &&
    b.top < a.bottom - SLACK_PX
  const containsPoint = (rect: DOMRect, point: DOMPoint) =>
    point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom
  const shrink = (rect: DOMRect, by: number) =>
    new DOMRect(rect.x + by, rect.y + by, rect.width - 2 * by, rect.height - 2 * by)
  const overlapsMostOfHeight = (a: DOMRect, b: DOMRect) =>
    intersects(a, b) &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) >
      MIN_OVERLAP_SHARE * Math.min(a.height, b.height)
  const connectors = [...document.querySelectorAll<SVGGeometryElement>(connectorSelector)]
  const allTexts = [...document.querySelectorAll(textSelector)]

  const svgDefects = (svg: SVGSVGElement): Finding[] => {
    const boxes = [...svg.querySelectorAll("rect")].map((rect) => rect.getBoundingClientRect())
    const texts = [...svg.querySelectorAll("text")].map((text) => ({
      text,
      rect: text.getBoundingClientRect(),
    }))

    // A centered label can overflow on both sides, leaving its first glyph outside the box.
    // A grouping plate cannot bound text that also touches a smaller box.
    const ownerOf = (rect: DOMRect) =>
      boxes
        .filter(
          (box) =>
            !boxes.some(
              (other) =>
                box.width * box.height > other.width * other.height &&
                containsRect(box, other) &&
                intersects(other, rect),
            ) &&
            rect.top + rect.height / 2 > box.top &&
            rect.top + rect.height / 2 < box.bottom &&
            Math.min(box.right, rect.right) - Math.max(box.left, rect.left) >
              0.5 * Math.min(box.width, rect.width),
        )
        .sort((a, b) => a.width * a.height - b.width * b.height)[0]
    const boxFindings = texts.flatMap(({ text, rect }): Finding[] => {
      const owner = ownerOf(rect)
      if (owner === undefined) {
        return boxes.some((box) => intersects(box, rect))
          ? [{ kind: "label-touches-box", detail: describe(text) }]
          : []
      }
      return containsRect(owner, rect)
        ? []
        : [
            {
              kind: "text-overflows-box",
              detail: `${describe(text)} by ${Math.round(
                Math.max(
                  owner.left - rect.left,
                  rect.right - owner.right,
                  owner.top - rect.top,
                  rect.bottom - owner.bottom,
                ),
              )}px`,
            },
          ]
    })

    const overlapFindings = texts.flatMap((a, index) =>
      texts
        .slice(index + 1)
        .filter((b) => overlapsMostOfHeight(a.rect, b.rect))
        .map((b) => ({
          kind: "text-overlaps-text",
          detail: `${describe(a.text)} and ${describe(b.text)}`,
        })),
    )

    return [...boxFindings, ...overlapFindings]
  }

  const samplePoints = (connector: SVGGeometryElement) => {
    const matrix = connector.getScreenCTM()
    const length = connector.getTotalLength()
    return Array.from({ length: Math.ceil(length / SAMPLE_STEP_PX) + 1 }, (_, index) => {
      const { x, y } = connector.getPointAtLength(Math.min(index * SAMPLE_STEP_PX, length))
      return new DOMPoint(x, y).matrixTransform(matrix ?? undefined)
    })
  }
  const crossingsOf = (svg: SVGSVGElement): CrossingCandidate[] => {
    const texts = [...svg.querySelectorAll("text")]
    return connectors
      .filter((connector) => svg.contains(connector))
      .flatMap((connector) => {
        const points = samplePoints(connector)
        return texts
          .filter((text) => {
            const inner = shrink(text.getBoundingClientRect(), labelInset)
            return points.some((point) => containsPoint(inner, point))
          })
          .map((text) => ({
            connectorIndex: connectors.indexOf(connector),
            textIndex: allTexts.indexOf(text),
            detail: describe(text),
          }))
      })
  }

  const clipsOverflow = (value: string) => value === "hidden" || value === "clip"
  // Screen-reader-only text is a 1px box clipped on purpose.
  const isScreenReaderOnly = (element: HTMLElement) =>
    element.clientWidth <= 1 || element.clientHeight <= 1
  const isClipped = (element: HTMLElement) => {
    const style = getComputedStyle(element)
    return (
      !isScreenReaderOnly(element) &&
      ((clipsOverflow(style.overflowX) && element.scrollWidth > element.clientWidth + SLACK_PX) ||
        (clipsOverflow(style.overflowY) && element.scrollHeight > element.clientHeight + SLACK_PX))
    )
  }
  const htmlFindings = [...document.querySelectorAll<HTMLElement>("body *")]
    .filter((element) => element.closest("svg") === null && isClipped(element))
    .map((element) => ({
      kind: "html-clipped",
      detail: `<${element.tagName.toLowerCase()}> ${describe(element)}`,
    }))

  const page = document.documentElement
  const scrollFindings =
    page.scrollWidth > page.clientWidth + SLACK_PX
      ? [
          {
            kind: "page-scrolls-sideways",
            detail: `${page.scrollWidth}px of content in ${page.clientWidth}px`,
          },
        ]
      : []

  const svgs = [...document.querySelectorAll("svg")]
  return {
    findings: [...svgs.flatMap(svgDefects), ...htmlFindings, ...scrollFindings],
    crossings: svgs.flatMap(crossingsOf),
  }
}

const parseArgs = (repoRoot: string) => {
  const [file, ...rest] = process.argv.slice(2)
  const outFlagIndex = rest.indexOf("--out")
  const outDir = outFlagIndex >= 0 ? rest[outFlagIndex + 1] : join(repoRoot, DEFAULT_OUT_SUBDIR)
  if (file === undefined || outDir === undefined) {
    console.error(`Usage: node ${process.argv[1]} <artifact.html> [--out <dir>]`)
    process.exit(2)
  }
  return { file: resolve(file), outDir: resolve(outDir) }
}

// A plugin install puts this script in Claude Code's plugin cache, so screenshots go in the repo
// it was run from. The check reads only the HTML file, so outside a repo they go under the cwd.
const findRepoRootOrCwd = () => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return process.cwd()
  }
}

const isModuleNotFound = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "MODULE_NOT_FOUND"

// A bare import would resolve from the plugin cache, which has no Playwright.
const loadChromium = (repoRoot: string): BrowserType => {
  try {
    const requireFromRepo = createRequire(join(repoRoot, "package.json"))
    const { chromium }: { chromium: BrowserType } = requireFromRepo("playwright")
    return chromium
  } catch (error) {
    if (!isModuleNotFound(error)) throw error
    console.error(
      [
        `checkArtifact.ts needs Playwright installed in ${repoRoot}. From there, run:`,
        "  npm install --save-dev playwright",
        "  npx playwright install chromium",
      ].join("\n"),
    )
    process.exit(2)
  }
}

const scrollToCrossingAndCheckVisible = async (
  page: Page,
  { connectorIndex, textIndex }: CrossingCandidate,
) => {
  const setConnectorVisibility = (visibility: string) =>
    page.evaluate(
      ({ selector, index, value }) => {
        const connector = document.querySelectorAll<SVGElement>(selector).item(index)
        connector.style.visibility = value
      },
      { selector: CONNECTOR_SELECTOR, index: connectorIndex, value: visibility },
    )
  // A full-page capture resizes the viewport, and pages that fit a diagram to it re-lay it out.
  // Scrolling the label into view also reaches labels inside horizontal scroll containers.
  const clip = await page.evaluate(
    ({ selector, index, inset }) => {
      const text = document.querySelectorAll(selector).item(index)
      text.scrollIntoView({ block: "center", inline: "center" })
      const { x, y, width, height } = text.getBoundingClientRect()
      return { x: x + inset, y: y + inset, width: width - 2 * inset, height: height - 2 * inset }
    },
    { selector: TEXT_SELECTOR, index: textIndex, inset: LABEL_INSET_PX },
  )
  const capture = () => page.screenshot({ clip, animations: "disabled" })
  const withConnector = await capture()
  await setConnectorVisibility("hidden")
  const withoutConnector = await capture()
  await setConnectorVisibility("")
  return !withConnector.equals(withoutConnector)
}

const visibleCrossingFindings = async (page: Page, crossings: CrossingCandidate[]) => {
  // One at a time, since each check toggles a connector on the shared page.
  const visible = await crossings.reduce<Promise<CrossingCandidate[]>>(
    async (accumulator, crossing) => {
      const visibleSoFar = await accumulator
      return (await scrollToCrossingAndCheckVisible(page, crossing))
        ? [...visibleSoFar, crossing]
        : visibleSoFar
    },
    Promise.resolve([]),
  )
  const labels = [...new Set(visible.map(({ detail }) => detail))]
  return labels.map((detail) => ({ kind: "line-crosses-text", detail }))
}

const checkAtWidth = async (browser: Browser, file: string, outDir: string, width: number) => {
  const page = await browser.newPage({ viewport: { width, height: VIEWPORT_HEIGHT } })
  await page.goto(pathToFileURL(file).href, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  const { findings, crossings } = await page.evaluate(findDefects, {
    connectorSelector: CONNECTOR_SELECTOR,
    textSelector: TEXT_SELECTOR,
    labelInset: LABEL_INSET_PX,
  })
  const crossingFindings = await visibleCrossingFindings(page, crossings)
  const screenshotPath = join(outDir, `${basename(file, extname(file))}-${width}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await page.close()
  return { width, screenshotPath, findings: [...findings, ...crossingFindings] }
}

const report = ({ width, screenshotPath, findings }: Awaited<ReturnType<typeof checkAtWidth>>) => {
  const summary = findings.length === 0 ? "clean" : `${findings.length} findings`
  console.log(`${width}px: ${summary} (${screenshotPath})`)
  findings.forEach(({ kind, detail }) => console.log(`  ${kind}: ${detail}`))
}

const main = async () => {
  const repoRoot = findRepoRootOrCwd()
  const { file, outDir } = parseArgs(repoRoot)
  const chromium = loadChromium(repoRoot)
  mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  try {
    const results = await Promise.all(
      VIEWPORT_WIDTHS.map((width) => checkAtWidth(browser, file, outDir, width)),
    )
    results.forEach(report)
    process.exitCode = results.some(({ findings }) => findings.length > 0) ? 1 : 0
  } finally {
    await browser.close()
  }
}

await main()
