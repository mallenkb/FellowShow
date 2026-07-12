// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MonitorSelectField } from "./monitor-select-field"
import type { MonitorInfo } from "@/lib/ipc"

const monitors: MonitorInfo[] = [
  {
    index: 0,
    name: "Built-in Display",
    width: 2560,
    height: 1600,
    x: 0,
    y: 0,
    isPrimary: true,
  },
  {
    index: 1,
    name: "Monitor #41053",
    width: 4112,
    height: 2658,
    x: 2560,
    y: 0,
    isPrimary: false,
  },
  {
    index: 2,
    name: "Monitor #41054",
    width: 1920,
    height: 1080,
    x: 6672,
    y: 0,
    isPrimary: false,
  },
]

function renderField(
  overrides: Partial<Parameters<typeof MonitorSelectField>[0]> = {}
) {
  const onValueChange = vi.fn()
  render(
    <MonitorSelectField
      monitors={monitors}
      value="1"
      onValueChange={onValueChange}
      refreshing={false}
      onRefresh={() => {}}
      takenMonitors={[]}
      {...overrides}
    />
  )
  return { onValueChange }
}

describe("MonitorSelectField", () => {
  afterEach(cleanup)

  it("shows no overlap warning when outputs target different monitors", () => {
    renderField({
      takenMonitors: [{ index: 2, outputName: "Main Output" }],
    })
    expect(screen.queryByText(/outputs will overlap/i)).toBeNull()
  })

  it("warns when another output targets the same monitor", () => {
    renderField({
      takenMonitors: [{ index: 1, outputName: "Main Output" }],
    })
    expect(screen.getByText(/same display as main output/i)).toBeTruthy()
  })

  it("names every output sharing the monitor", () => {
    renderField({
      takenMonitors: [
        { index: 1, outputName: "Main Output" },
        { index: 1, outputName: "Output 3" },
      ],
    })
    expect(
      screen.getByText(/same display as main output and output 3/i)
    ).toBeTruthy()
  })

  it("moves the output to a free display in one click", async () => {
    const user = userEvent.setup()
    const { onValueChange } = renderField({
      takenMonitors: [{ index: 1, outputName: "Main Output" }],
    })

    await user.click(
      screen.getByRole("button", { name: /use monitor #41054/i })
    )

    expect(onValueChange).toHaveBeenCalledWith("2")
  })

  it("offers no quick fix when every monitor is taken", () => {
    renderField({
      monitors: [monitors[0]],
      value: "0",
      takenMonitors: [{ index: 0, outputName: "Main Output" }],
    })
    expect(screen.getByText(/outputs will overlap/i)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /^use /i })).toBeNull()
  })
})
