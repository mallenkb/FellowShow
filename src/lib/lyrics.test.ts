import { describe, expect, it } from "vitest"
import { splitLyricBlocks } from "./lyrics"

describe("splitLyricBlocks", () => {
  it("merges standalone section headings with the following lyrics", () => {
    const blocks = splitLyricBlocks(`1 Peter 5:6
King James Version
[Key: Ab]

Verse 1

Humble yourselves therefore
Under the mighty hand of God

Verse 2

Casting all your care upon Him;
For He careth for you;`)

    expect(blocks).toEqual([
      {
        label: "Verse 1",
        text: "Humble yourselves therefore\nUnder the mighty hand of God",
      },
      {
        label: "Verse 2",
        text: "Casting all your care upon Him;\nFor He careth for you;",
      },
    ])
  })

  it("splits numbered song verses and chorus markers", () => {
    const blocks = splitLyricBlocks(`1. Amazing grace! how sweet the
sound
That saved a wretch like me
Chorus
Praise the Lord
Praise the Lord
2. Twas grace that taught my heart
to fear
PH 22`)

    expect(blocks).toEqual([
      {
        label: "Verse 1",
        text: "Amazing grace! how sweet the\nsound\nThat saved a wretch like me",
      },
      {
        label: "Chorus",
        text: "Praise the Lord\nPraise the Lord",
      },
      {
        label: "Verse 2",
        text: "Twas grace that taught my heart\nto fear",
      },
    ])
  })

  it("removes author credits and key markers from display text", () => {
    const blocks = splitLyricBlocks(`Verse 1
Matt Redman and Jonas Myrin
[Key: C#]
Bless the Lord O my soul
O my soul
Worship His holy name`)

    expect(blocks).toEqual([
      {
        label: "Verse 1",
        text: "Bless the Lord O my soul\nO my soul\nWorship His holy name",
      },
    ])
  })

  it("removes author and hymnal source credits from stanza endings", () => {
    const blocks = splitLyricBlocks(`6. Come as the wind - with rushing
sound
And Pentecostal grace;
That all of woman born may see
The glory of Thy face
A Reed, RH 210`)

    expect(blocks).toEqual([
      {
        label: "Verse 6",
        text: "Come as the wind - with rushing\nsound\nAnd Pentecostal grace;\nThat all of woman born may see\nThe glory of Thy face",
      },
    ])
  })

  it("splits long stanzas into smaller presentation blocks", () => {
    const blocks = splitLyricBlocks(`1. Crown Him with many crowns,
The Lamb upon His throne;
Hark! how the heavenly anthem drowns
All music but its own:
Awake, my soul, and sing
Of Him who died for thee,
And hail Him as thy matchless King
Through all eternity.`)

    expect(blocks).toEqual([
      {
        label: "Verse 1",
        text: "Crown Him with many crowns,\nThe Lamb upon His throne;\nHark! how the heavenly anthem drowns\nAll music but its own:",
      },
      {
        label: "Verse 1",
        text: "Awake, my soul, and sing\nOf Him who died for thee,\nAnd hail Him as thy matchless King\nThrough all eternity.",
      },
    ])
  })

  it("keeps a six-line stanza together when it can fit", () => {
    const blocks = splitLyricBlocks(`3. Through many dangers,
Toils and snares,
I have already come;
'Tis grace hath brought
Me safe thus far,
And grace will lead me home.`)

    expect(blocks).toEqual([
      {
        label: "Verse 3",
        text: "Through many dangers,\nToils and snares,\nI have already come;\n'Tis grace hath brought\nMe safe thus far,\nAnd grace will lead me home.",
      },
    ])
  })
})
