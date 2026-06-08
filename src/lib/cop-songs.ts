export type CopSongLanguage = "english" | "twi"
export type CopSongSource = "built-in" | "theme-2026" | "theme-2025" | "pentecostal-book"

export interface CopSong {
  id: string
  language: CopSongLanguage
  languageLabel: string
  number: number
  title: string
  lyrics: string
  source?: CopSongSource
  sourceLabel?: string
}

export const copSongs: CopSong[] = [
  {
    "id": "english-1",
    "language": "english",
    "languageLabel": "English",
    "number": 1,
    "title": "Worthy, worthy is the Lamb Worthy, worthy is the lamb",
    "lyrics": "Worthy, worthy is the Lamb\nWorthy, worthy is the lamb\nWorthy , worthy is the lamb; that\nWas slain\nPraise the lord, Hallelujah\nPraise the lord, Hallelujah\nPraise the lord, Hallelujah\nPraise ye the lord\nPH 1"
  },
  {
    "id": "english-2",
    "language": "english",
    "languageLabel": "English",
    "number": 2,
    "title": "His love for me brought Jesus to earth as my saviour",
    "lyrics": "His love for me brought Jesus to\nearth as my saviour,\nHis love for me brought Jesus to die\nOn the tree\nHis love for me is bringing me\nnearer to glory\nOne day I’ll know all the depths of\nHis love for me\nPH 5"
  },
  {
    "id": "english-3",
    "language": "english",
    "languageLabel": "English",
    "number": 3,
    "title": "He’s the faithfullest of friends, to me, to me",
    "lyrics": "He’s the faithfullest of friends,\nto me, to me;\nhe’s unchanging to the end,\nIs he, Is he;\nWhen the surging waters roll,\nHe’s the comfort of my soul;\nHe’s the faithfullest of friends\nto me, to me\nPH 6"
  },
  {
    "id": "english-4",
    "language": "english",
    "languageLabel": "English",
    "number": 4,
    "title": "Amazing grace! how sweet the sound",
    "lyrics": "1. Amazing grace! how sweet the\nsound\nThat saved a wretch like me!\nI once was lost, but now I’m\nfound\nWas blind but now I see\n2. ’Twas grace that taught my\nheart to fear,\nAnd grace my fears relieved;\nHow precious did that grace\nappear,\nThe hour I first believed!\n3. Thro’ many dangers, toils, and\nsnares,\nI have already come;\nTis  grace hath brought me safe\nthus Far,\nAnd grace will lead me home.\n4. The lord has promised good to me\nHis word my hope secures.\nHe will my shield and portion be\nAs long as life endures.\n5 And when his flesh and heart\nshall fail\nAnd mortal life shall cease\nI shall possess within the veil\nA life of joy and peace.\n6. When we’ve been there ten\nthousand years,\nBright shinning as the sun,\nWe’ve no less days to sing\nGod’s grace,\nThan when we’ve first began.\nJohn Newton, PH 22"
  },
  {
    "id": "english-5",
    "language": "english",
    "languageLabel": "English",
    "number": 5,
    "title": "We’ll follow him together wherever",
    "lyrics": "We’ll follow him together wherever\nHe leads.\nBeside the living waters, our souls\nHe doth feed;\nWhatever be the conflict,\nHe’ll meet our every need.\nWe’ll follow him together\nWherever he may lead\nPH 41"
  },
  {
    "id": "english-6",
    "language": "english",
    "languageLabel": "English",
    "number": 6,
    "title": "My heart is so full, is so full, is so full",
    "lyrics": "My heart is so full, is so full, is so full\nMy heart is so full;\nI’ve taken a bath in the cleansing\nwave,\nI’ve trusted in Jesus, the mighty to\nsave,\nMy heart is so full, is so full, is so full.\nPH 47, P ANT 632"
  },
  {
    "id": "english-7",
    "language": "english",
    "languageLabel": "English",
    "number": 7,
    "title": "Abide under his anointing, Abide under his control",
    "lyrics": "Abide under his anointing,\nAbide under his control,\nAbide under his anointing,\nHis presence upon your soul;\nJust stay in the hands of Jesus\nAnd thou shall be fully whole;\nAbide under his anointing,\nAbide under his control,\nPH 64"
  },
  {
    "id": "english-8",
    "language": "english",
    "languageLabel": "English",
    "number": 8,
    "title": "Here’s my cup, lord, I lift it up to thee",
    "lyrics": "Here’s my cup, lord, I lift it up to thee\nCome and quench, this thirsting of\nmy Soul;\nBread of heaven, feed me till I want\nNo more;\nHere’s my cup, fill it up and make\nme Whole.\nPH 75"
  },
  {
    "id": "english-9",
    "language": "english",
    "languageLabel": "English",
    "number": 9,
    "title": "1 Seek ye first the kingdom of God",
    "lyrics": "1 Seek ye first the kingdom of God\nAnd his righteousness,\nAnd all these things shall be dded\nUnto you,\nHallelu Halleluia!\nChorus\nHalleluia!\nHalleluia! Halleluia!\nHallelu! Halleluia!\n2. Men shall not live by bread alone\nBut by every word\nThat proceeds from the mouth of God\nHallelu! Halleluia!\n3. Ask and it shall be given unto you,\nSeek and ye shall find;\nKnock and it shall be opened\nunto You;\nHallelu!  Halleluia!\nPH 97"
  },
  {
    "id": "english-10",
    "language": "english",
    "languageLabel": "English",
    "number": 10,
    "title": "Show us thy glory, O lord, Show us thy glory , O lord",
    "lyrics": "Show us thy glory, O lord,\nShow us thy glory , O lord;\nLet the dew of heaven bring us\nRefreshing\nAnd show us thy glory once more.\nPH 118"
  },
  {
    "id": "english-11",
    "language": "english",
    "languageLabel": "English",
    "number": 11,
    "title": "I see the lord , I see the lord; He is high and lifted up and his",
    "lyrics": "I see  the lord , I see the lord;\nHe is high and lifted up and his\ntrain\nFills the temple,\nHe is high and lifted up and his\ntrain\nFills the temple\nHis angels cry holy ! His angels cry\nHoly!\nHis angels cry holy is the lord !\nPH 140"
  },
  {
    "id": "english-12",
    "language": "english",
    "languageLabel": "English",
    "number": 12,
    "title": "We’re building a road, building a road",
    "lyrics": "We’re building a road, building a road\nHelping the weak and blind,\nWe’re smoothing the road that\nleads\nTo heaven above,\nTo make easy for those behind.\nPH 143"
  },
  {
    "id": "english-13",
    "language": "english",
    "languageLabel": "English",
    "number": 13,
    "title": "What singing there will be up there",
    "lyrics": "What singing there will be up there,\nWhat singing there will be up there,\nWhen face to face with Jesus we\nshall Stand.\nAnd join the heavenly choir in the\nbetter Land;\nWhat singing there will be up there,\nWhat glory for the saints to share,\nO Glory, glory, glory!\nWhat singing there will be up there.\nPH 151\nHugh Mitchell"
  },
  {
    "id": "english-14",
    "language": "english",
    "languageLabel": "English",
    "number": 14,
    "title": "He lives, he lives, Christ Jesus lives",
    "lyrics": "He lives, he lives, Christ Jesus lives\nToday!\nHe walks with me and talks with me\nA long life’s narrow way;\nHe lives, he lives\nSalvation to impart,\nYou ask me how I know he lives?\nHe lives within my heart.\nPH 158, A.H. Acklley"
  },
  {
    "id": "english-15",
    "language": "english",
    "languageLabel": "English",
    "number": 15,
    "title": "He’s been a friend to me many a time",
    "lyrics": "He’s been a friend to me many a time\nHe’s been a friend to me many a time\nMany a time;\nI Laugh and I sing and I feel like a\nking,\nFor he’s saved me from sin and from\nCrime;\nHe’s been a friend to me, many a time\nMany a time.\nPH 159"
  },
  {
    "id": "english-16",
    "language": "english",
    "languageLabel": "English",
    "number": 16,
    "title": "Fairest of all earth beside. Chiefest of all unto thy bride",
    "lyrics": "Fairest of all earth beside.\nChiefest of all unto thy bride,\nFullest divine in thee I see,\nWonderful man of calvary\nChorus\nThat man of calvary\nHas won my heart from me,\nAnd died to set me free,\nBlest man of calvary\n2. Granting the sinner life and peace\nGranting the captive sweet\nrelease\nShedding his blood to make us Free\nMerciful man of calvary!\n3. Giving the gifts obtained for men\nPouring out love beyond our ken\nGiving us spotless purity,\nBountiful man of calvary!\n4. Comfort of all my earthly way\nJesus I’ll meet thee some sweet\nDay;\nCentre of glory thee I’ll see\nWonderful man of calvary\nPH 167 - M.P . Ferguson"
  },
  {
    "id": "english-17",
    "language": "english",
    "languageLabel": "English",
    "number": 17,
    "title": "I hear the words of love I gaze upon the blood",
    "lyrics": "1. I hear the words of love\nI gaze upon the blood,\nI see the mighty sacrifice,\nAnd I have peace with God\n2. Tis everlasting peace’\nSure as Jehovah ‘s  name;\nTis stable as his steadfast\nthrone\nFor evermore the same\n3 The clouds may go and come,\nAnd storms may sweep my sky,\nThis blood-sealed friendship\nChanges not;\nThe cross is ever nigh.\n4. My love is of times low,\nMy joy still ebbs and flows;\nBut peace with him remains the\nSame;\nNo change Jehovah   knows\n5. I change, he changes not,\nThe Christ can never die,\nHis love, not mine, the resting\nplace\nHis truth not mine, the tie.\nHoratius Boner, PH. 173"
  },
  {
    "id": "english-18",
    "language": "english",
    "languageLabel": "English",
    "number": 18,
    "title": "1 Search me, O God, and know my heart today",
    "lyrics": "1 Search me, O God, and know\nmy heart today;\nTry me, o lord and know my\nthoughts, I pray,\nSee if there be some wicked\nway in me;\nCleanse me from ev’ry sin and\nset me free.\n2. I praise thee, lord for cleansing\nme from sin;\nFulfil thy word and make me\npure within\nFill me with fire where once I\nburned with shame;\nGrant my desire to magnify thy\nname.\n3. Lord, take my life and make it\nwholly thine;\nFill my poor heart with thy great\nlove divine\nTake all my will, my passion,\nself, and pride,\nI now surrender- lord in me abide.\n4. O holy ghost, revival comes from\nThee;\nSend a revival-start the work in me\nThy word declares thou will\nsupply our need\nFor blessings now, O lord,\nI humbly plead.\nPH. 199, Edwin Orr"
  },
  {
    "id": "english-19",
    "language": "english",
    "languageLabel": "English",
    "number": 19,
    "title": "Jesus, see me at thy feet, Nothing but thy blood can save me",
    "lyrics": "Jesus, see me at thy feet,\nNothing but thy blood can save me;\nThou alone my need canst meet,\nNothing but thy blood can save me\nChorus:\nNo! No! Nothing do I bring,\nBut by faith I’m clinging,\nTo thy cross, O lamb of God!\nNothing but thy blood can save me\n2. See my heart, lord torn with\ngrief,\nNothing but thy blood can save\nme;\nMe unpardoned do not leave,\nNothing but thy blood save me.\n3. Dark, indeed, the past has been ,\nNothing, but thy blood can save\nme,\nYet in mercy take me in\nNothing but thy blood can save me.\n4. As I am , O,  hear me pray,\nNothing but thy blood can save\nme;\nI can ne’er remove a stain\nNothing but thy blood can save\nme.\n5. Lord, I cast myself on thee,\nNothing but thy blood can save\nme;\nFrom my guilt, O set me free\nNothing but thy blood can save\nme,\nPH 210, R Slater"
  },
  {
    "id": "english-20",
    "language": "english",
    "languageLabel": "English",
    "number": 20,
    "title": "Wounded for me, wounded for me, There on the cross he was",
    "lyrics": "1. Wounded for me, wounded for me,\nThere on the cross he was\nwounded for me,\nGone my transgressions and\nnow I am free\nAll  because Jesus was\nwounded for me.\n2. Dying for me ,dying for me\nThere on the cross he was dying\nFor me,\nNow in his death my redemption\nI see,\nAll because Jesus was dying for me.\n3. Risen for me, risen for me\nUp from the grave he has risen\nfor me;\nNow evermore from death’s\nsting I am free,\nAll because Jesus was dying for me.\n4. Living for me ,living for me,\nThere on the throne he is living\nfor me:\nSaved  to the uttermost now I\nshall be.\nAll because Jesus was dying for me.\n5. Coming for me ,coming for me.\nOne day to earth he is coming\nfor me;\nThen with what joy his dear face\nI shall see.\nO how I praise him-he’s coming\nfor me.\nPH 228, AGR."
  },
  {
    "id": "english-21",
    "language": "english",
    "languageLabel": "English",
    "number": 21,
    "title": "What can wash away my stain? Nothing but the blood of Jesus",
    "lyrics": "1. What can wash away my stain?\nNothing but the blood of Jesus .\nWhat can make me whole again?\nNothing but the blood of Jesus.\nChorus\nO! Precious is the flow;\nThat makes me white as snow\nNo other fount I know,\nNothing but the blood of Jesus\n2. For my cleansing this I see,\nNothing but the blood of Jesus\nFor my pardon ,this my plea.\nNothing but the blood of Jesus.\n3. Nothing can for sin atone.\nNothing but the blood of Jesus,\nNought of good that I have\ndone,\nNothing but the blood of Jesus.\n4. This is all my hope and peace,\nNothing but the blood of Jesus,\nHe is all my righteousness\nNothing but the blood of Jesus.\n5. Now by this I overcome;\nNothing but the blood of Jesus;\nNow by this I’ll reach my home\nNothing but the blood of Jesus!\nRH. 33, R. Lowry"
  },
  {
    "id": "english-22",
    "language": "english",
    "languageLabel": "English",
    "number": 22,
    "title": "O Ye sons of God ,sing halleluia’ To Jesus Christ, the son of God",
    "lyrics": "1. O Ye sons of God ,sing halleluia’\nTo Jesus Christ, the son of God;\nHe is king of kings and lord of\nLords\nSo sing halleluia to messiah!\n2. All  ye saints of the lord, arise\nand shine\nYour light is come through Jesus\nChrist\nHe is prince of peace, saviour\nwonderful;\nSo sing halleluia to the messiah!\n3. Lamb of calvary , no sinful man,\nHe lived and died, for you and\nme;\nThere is victory for ever more!\nSo sing Halleluia to the messiah!\n4. Sing Halleluia! Shout halleluia!\nWatch halleluia! Pray halleluia!\nDance halleluia! Everything\nhalleuia!\nSo sing halleluia to the messiah\nPH 243"
  },
  {
    "id": "english-23",
    "language": "english",
    "languageLabel": "English",
    "number": 23,
    "title": "Doing the work of the lord, Publishing his mighty name",
    "lyrics": "Doing the work of the lord,\nPublishing his mighty name;\nDoing the work of the lord,\nTelling of his love to all,\nInto the world we go.\nSowing the precious seed\nSowing in the morning, sowing in\nthe noon-tide\nSowing when the sun goes down\nPH. 262"
  },
  {
    "id": "english-24",
    "language": "english",
    "languageLabel": "English",
    "number": 24,
    "title": "Jesus, how lovely you are! You are so gentle, so pure and so",
    "lyrics": "Jesus, how lovely you are!\nYou are so gentle, so pure and so\nkind;\nYou shine like the morning star:\nJesus, how lovely you are!\nPH 314"
  },
  {
    "id": "english-25",
    "language": "english",
    "languageLabel": "English",
    "number": 25,
    "title": "Majesty, worship his majesty; Unto Jesus be all glory, honour and",
    "lyrics": "Majesty, worship his majesty;\nUnto Jesus be all glory, honour and\npraise;\nMajesty, kingdom authority,\nFlows from his throne unto his own,\nHis anthem raise,\nSo exalt, lift up on high\nThe name of Jesus;\nMagnify, come glory\nChrist Jesus the king\nMajesty, worship his majesty;\nJesus who died, now glorified\nKing of all kings.\nPH 341"
  },
  {
    "id": "english-26",
    "language": "english",
    "languageLabel": "English",
    "number": 26,
    "title": "Praise to the holiest in the height",
    "lyrics": "1. Praise to the holiest in the height,\nAnd in the depth be praise:\nIn all his words most wonderful,\nMost sure in all his ways.\n2. O loving wisdom of our God!\nWhen all was sin and shame,\nA second Adam to the fight,\nAnd to the rescue came.\n3. O wisest love that flesh and blood\nWhich  did in adam fail,\nShould strive afresh against the foe,\nShould strive and should prevail.\n4. And that a higher gift that grace\nshould flesh and blood refine;\nGod’s presence, and his very self\nAnd essence all-divine\n5. O generous love that he, who\nsmote\nIn man for man the foe,\nThe double agony in man\nFor man should undergo\n6. And in the garden secretly,\nAnd on the cross on high\nShould teach his brethren, and\ninspire\nTo suffer and to die\n7. Praise to the holiest in the height\nAnd in the depth be praise\nIn all his words most wonderful\nMost sure in all his ways\nJ.H Newman, RH 28"
  },
  {
    "id": "english-27",
    "language": "english",
    "languageLabel": "English",
    "number": 27,
    "title": "I’m pressing on the upward way, New heights I’m gaining every",
    "lyrics": "1. I’m pressing on the upward way,\nNew heights I’m gaining every\nday;\nStill praying as I onward bound,\n“Lord plant my feet on higher\nground\nChorus\nLord, lift me up and let me stand\nBy faith, on heavens table-land;\nWhere love and joy, and light abound,\nLord plant my feet on higher\nground\n2. My heart has no desire to stay\nWhere doubts arise, and fear\ndismay\nThough some may dwell where\nthese abound\nMy Constant aim is higher ground\n3. Beyond the mist I fain would\nrise,\nTo rest beneath unclouded\nskies,\nAbove earth’s turmoil is peace\nfound;\nBy those who dwell on higher\nground\n4. I long to scale the utmost height\nThough rough the way, and\nhard the fight,\nMy song, while climbing shall\nresound\nLord, lead me on the higher\nground\n5. Lord, lead me up the mountain\nside\nI dare not climb without my Guide;\nAnd, heaven gained, I’ll gaze\naround\nWith grateful heart from higher\nground\nRH393"
  },
  {
    "id": "english-28",
    "language": "english",
    "languageLabel": "English",
    "number": 28,
    "title": "Spirit Divine, attend our prayers And make our hearts Thy home",
    "lyrics": "1. Spirit Divine, attend our prayers\nAnd make our hearts Thy home;\nDescend with all Thy gracious\npowers.\nO come, great Spirit come.\n2. Come as the light - to us reveal\nOur need of Thee below;\nAnd  lead us in those paths of  life\nWhere all the righteous go.\n3. Come as the fire - and purge\nour hearts\nWith sacrificial flame;\nLet our whole self an offering be\nTo our Redeemer’s name\n4 Come as the dew - and sweetly\nbless\nThis consecrated hour\nMay barrenness rejoice to own\nThy fertilising power.\n5. Come as the Dove - and spread\nThy wings\nThe wings of peaceful love;\nAnd let Thy Church on earth\nbecome\nBlest as the Church above.\n6. Come as the wind - with rushing\nsound\nAnd Pentecostal grace;\nThat all of woman born may see\nThe glory of Thy face\nA Reed, RH 210"
  },
  {
    "id": "english-29",
    "language": "english",
    "languageLabel": "English",
    "number": 29,
    "title": "“There shall be showers of blessing",
    "lyrics": "1. “There shall be showers of\nblessing\nThis is the promise of love;\nThere shall be seasons\nrefreshing,\nSent from the Saviour above.\nChorus\nSho...wers of blessing\nShowers of blessing we need\nMercy drops round us are falling\nBut for the showers we plead.\n2. There shall be showers of\nblessing\nPrecious reviving again;\nOver the hills and the Valleys\nSound of abundance of rain\n3. “There shall be showers of\nblessing\nSend them upon us, O Lord\nGrant to us now a refreshing;\nCome, and now honour Thy word.\n4. “There shall be showers of\nblessing\nOh, that to-day they might fall\nNow, as to God, we’re confessing,\nNow as on Jesus we call.\n5. “There shall be showers of\nblessing”\nIf we but trust and obey\nThere shall be seasons refreshing,\nIf we let God have His way\nEl Nathan, RH245"
  },
  {
    "id": "english-30",
    "language": "english",
    "languageLabel": "English",
    "number": 30,
    "title": "Rescue the perishing Care for the dying",
    "lyrics": "1. Rescue the perishing\nCare for the dying\nSnatch them in pity from sin\nand the grave\nWeep o’er the erring one\nLift up the fallen\nTell them of Jesus\nThe Mighty to save\nChorus\nRescue the perishing\ncare for the dying\nJesus is merciful, Jesus will save\n2. Though they are slighting Him\nStill He is waiting\nWaiting the penitent child to\nreceive,\nPlead with them earnestly\nPlead with them gently.\nHe will forgive, if they only\nbelieve\n3. Down in the human heart\nCrushed by the tempter\nFeelings lie buried that grace\ncan restore\nTouched by a loving hand,\nWakened by kindness\nChords that were broken will\nVibrate once more.\n4. Rescue the perishing,\nDuty demand it;\nStrength for thy labour the Lord\nwill provide\nBack to the narrow way\nPatiently win them;\nTell the poor wand’rer a Saviour\nhas died\nRH 561, Fanny J. Crosby."
  },
  {
    "id": "english-31",
    "language": "english",
    "languageLabel": "English",
    "number": 31,
    "title": "Have Thine own way, Lord! Have Thine own way!",
    "lyrics": "1. Have Thine own way, Lord!\nHave Thine own way!\nThou art the Potter;\nI am the clay.\nMould me and make me\nAfter Thy will,\nWhile I am waiting\nYielded and still.\n2. Have Thine own way, Lord!\nHave Thine own way!\nSearch me and try me\nMaster, today!\nWhiter than snow, Lord\nWash me just now\nAs in Thy presence\nHumbly I bow\n3. Have Thine own way, Lord!\nHave Thine own Way!\nWounded and weary\nHelp me, I pray!\nPower all power\nSurely is Thine!\nTouch me and heal me,\nSaviour Divine\n4. Have Thine own way, Lord!\nHave Thine own way!\nHold o’er my being\nAbsolute sway!\nFill with thy Spirit\nTill all shall see\nChrist only, always\nLiving in me!\nRH. 573"
  },
  {
    "id": "english-32",
    "language": "english",
    "languageLabel": "English",
    "number": 32,
    "title": "I am Thine, O Lord, I have heard Thy voice",
    "lyrics": "1. I am Thine, O Lord, I have heard\nThy voice\nAnd it told thy love to me But I\nLong to rise in the arms of faith\nAnd be closer drawn to Thee.\nChorus\nDraw me near ... er ... nearer\nBlessed Lord\nTo the Cross where Thou hast\ndied, Draw me nearer, nearer,\nnearer, blessed Lord\nTo Thy precious, bleeding side\n2. Consecrate me now to Thy\nservice, Lord\nBy the power of grace divine\nLet my soul look up with a stead\nfast hope,\nAnd my will be lost in Thine\n3. O the pure delight of a single\nhour,\nThat before Thy throne I spend;\nWhen I kneel in prayer, and with\nThee my God\nI commune as friend with friend."
  },
  {
    "id": "english-33",
    "language": "english",
    "languageLabel": "English",
    "number": 33,
    "title": "Breathe on me, Breath of God fill me with life a new",
    "lyrics": "1. Breathe on me, Breath of God\nfill me with life a new\nThat I may love What Thou\ndost love\nAnd do what Thou wouldst do\n2. Breathe on me, Breath of God\nUntil my heart is pure\nUntil with Thee I will one will,\nTo do and to endure\n3. Breathe on me Breath of God\nTill I am wholly Thine,\nTill all this earthly part of me\nGlows with Thy fire divine\n4. Breathe on me, Breath of God\nso shall I never die\nBut live with Thee the perfect life\nOf Thine eternity\nRH 536, Edwin Hatch"
  },
  {
    "id": "english-34",
    "language": "english",
    "languageLabel": "English",
    "number": 34,
    "title": "Now I feel the sacred fire, Kindling, flaming, glowing",
    "lyrics": "1. Now I feel the sacred fire,\nKindling, flaming, glowing\nHigher still, and rising higher,\nAll my soul o’er flowing\nLife immortal I receive;\nOh, the wonderous story\nI was dead but now I live,\nGlory! Glory! Glory!\n2. Now I am from bondage freed\nEvery bond in riven\nJesus makes me free indeed,\nJust as free as heaven;\n‘Tis a glorious liberty,\nOh, the wonderous story;\nI was bound, but now I’m free\nGlory! Glory! Glory!\n3. Let the testimony roll,\nRoll through every nation\nWitnessing from soul to soul\nThis immense salvation\nNow I know it’s full and free\nOh, the wonderous story!\nFor I feel it saving me\nGlory! Glory! Glory!\n4. Glory be to God on high\nGlory be to Jesus\nHe hath brought salvation nigh\nFrom all sin He frees us;\nLet the golden harps of God,\nRing the wonderous story;\nLet the pilgrims shout aloud\nGlory! Glory! Glory!\n5. Let the trump of jubilee\nThe glad tidings thunder,\nJesus sets the captives free,\nBursts their bonds asunder,\nFetters break and dungeons fall\nOh, the wonderous story\nThis salvation’s free to all\nGlory! Glory! Glory!\nRH 216"
  },
  {
    "id": "english-35",
    "language": "english",
    "languageLabel": "English",
    "number": 35,
    "title": "How sweet the name of Jesus sounds",
    "lyrics": "1. How sweet the name of Jesus\nsounds\nIn a believer’s ear\nIt soothes his sorrows, heals his\nwounds\nAnd drives aways his fear\n2. It makes the wounded spirit\nwhole,\nAnd calms the troubled breast;\n‘Tis manna’ to the hungry soul\nAnd to the weary rest.\n3. Dear name, the rock on while I\nbuild\nMy shield and hiding place\nMy never-failing treasury filled\nWith boundless stores of\ngraces.\n4. Jesus, my Shepherd, Saviour\nfriend\nMy Prophet, Priest and King\nMy Lord, my Life my Way my End\nAccept the praise I bring.\n5. Weak is the effort of my heart,\nAnd cold my warmest thought;\nBut when I see Thee as Thou art\nI’ll praise Thee as I ought.\n6. I would Thy boundless love\nproclaim\nWith every fleeting breath;\nSo shall the music of Thy name\nRefresh my soul in death\nRH 155, John Newton"
  },
  {
    "id": "english-36",
    "language": "english",
    "languageLabel": "English",
    "number": 36,
    "title": "Jesus shall reign where’er the sun",
    "lyrics": "1. Jesus shall reign where’er the sun\nDoth this successive journeys\nrun;\nHis kingdom stretch from shore\nto shore\nTill suns shall rise and set no more\n2. For Him shall endless prayer be\nmade;\nAnd praises throng to crown\nHis head;\nHis Name like sweet perfume\nshall rise\nWith every morning sacrifice.\n3. People and realms of every\ntongue\nDwell on His love with sweetest\nsong;\nAnd infant voices shall proclaim\nTheir young hosannas to His Name\n4. Blessings abound where’er he\nreigns,\nThe prisoner leaps to lose his\nchains.\nThe weary find eternal rest,\nAnd all the sons of want are blest.\n5. Where He displays His healing\npower;\nDeath and the curse are known\nno more;\nIn Him the tribes of Adam boast\nMore blessings than their Father\nlost.\n6. Let every creature rise and bring,\nIts grateful honours to our King:\nAngels descend with songs again,\nAnd earth prolong the joyful\nstrain.\nRH 190, Isaac Warts"
  },
  {
    "id": "english-37",
    "language": "english",
    "languageLabel": "English",
    "number": 37,
    "title": "Take my life, and let it be Consecrated, Lord, to Thee",
    "lyrics": "1. Take my life, and let it be\nConsecrated, Lord, to Thee,\nTake my moments and my days,\nLet them flow in ceaseless praise\n2. Take my hands, and let them move\nAt the impulse of Thy love;\nTake my feet, and let them be\nSwift and beautiful from Thee.\n3. Take my voice and let me sing\nAlways! Only, for my King\nTake my lips and let them be\nFilled with messages from Thee.\n4. Take my silver and my gold;\nNot a mite would I withhold;\nTake my intellect, and use\nEvery power as Thou shalt choose\n5. Take my will and make it Thine,\nIt shall be no longer mine;\nTake my heart, if is Thine own;\nIt shall be Thy royal throne.\n6. Take my love; my Lord, I pour\nAt Thy feet its treasure-store;\nTake myself and I will be\nEver, only, all for Thee.\nRH 582, RH. Lovers"
  },
  {
    "id": "english-38",
    "language": "english",
    "languageLabel": "English",
    "number": 38,
    "title": "Guide me, O Thou Great Jehovah! Pilgrim through this barren land",
    "lyrics": "1. Guide me, O Thou Great  Jehovah!\nPilgrim through this barren land;\nI am weak, but thou art mighty,\nHold me with Thy powerful\nhand;\nBread of heaven!\nBread of heaven!\nFeed me now and evermore.\n2. Open Thou the crystal fountain\nWhence the healing stream doth\nflow;\nLet the fiery, cloudy pillar\nLead me all my journey through;\nStrong Deliverer!\nStrong Deliverer!\nBe Thou still my strength and\nshield.\n3. If I tread the verge of Jordan,\nBid my anxious fears subside;\nBear me through the swelling\ntorrent\nLand me safe on Canaan’s side;\nSongs of praise!\nSongs of praise!\nI will ever give to Thee.\n4. Saviour, come! We long to see Thee\nLong to dwell with thee above;\nAnd to know in full communion,\nAll the sweetness of Thy love,\nCome, Lord Jesus!\nCome, Lord Jesus!\nTake Thy waiting people home.\nRH 462, W. Williams"
  },
  {
    "id": "english-39",
    "language": "english",
    "languageLabel": "English",
    "number": 39,
    "title": "What a friend we have in Jesus All our sins and griefs to bear",
    "lyrics": "1. What a friend we have in Jesus\nAll our sins and griefs to bear,\nWhat a privilege to carry\nOh, what peace we often forfeit,\nOh, what needless pain we bear\nAll because we do not carry\nEv’rything to God in prayer.\n2. Have we trials and temptations?\nIs there trouble anywhere?\nWe should never be discouraged,\nTake it to the Lord in prayer,\nCan we find a Friend sofaithful,\nWho will all our sorrows share?\nJesus knows our ev’ry weakness\nTake it to the Lord in prayer\n3. Are we weak and heavy laden,\nCumbered with a load of care?\nPrecious Saviour, still our refuge,\nTake it to the Lord in prayer\nDo thy friends despise, forsake\nthee?\nTake it to the Lord in prayer;\nIn His arms He’ll take and shield\nthee\nThou wilt find a solace there.\nRH 532, Joseph Scriven"
  },
  {
    "id": "english-40",
    "language": "english",
    "languageLabel": "English",
    "number": 40,
    "title": "There is no name so sweet on earth",
    "lyrics": "1. There is no name so sweet on earth,\nNo name so sweet in heaven\nThe name before His wondrous\nbirth,\nTo Christ, the Saviour given.\nChorus\nWe love to sing of Christ our King\nAnd hail Him, blessed Jesus!\nFor there’ s no word ear ever heard,\nSo dear, so sweet as “Jesus”\n2. “Twas Gabriel first that did Proclaim\nTo His most blessed mother,\nThat name which now and evermore\nWe praise above all other.\n3.  And when He hung upon the tree,\nThey wrote His name above Him,\nThat all might see the reason we\nFor evermore must love Him.\n4. So now, upon His Father’s throne,\nAlmighty to release us\nFrom sin and pain He ever reigns\nThe Prince and Saviour Jesus.\n5. O Jesus! By that matchless name\nThy grace shall fail us never,\nToday as yesterday the same.\nThou are the same forever.\n6. To Jesus ev’ry knee shall bow\nAnd ev’ry tongue confess him\nAnd we unite with saintes in\nlight\nOur only LOrd, to bless Him.\nGeo W. Bethune\nPH 280"
  },
  {
    "id": "english-41",
    "language": "english",
    "languageLabel": "English",
    "number": 41,
    "title": "My faith has found a resting place",
    "lyrics": "1. My faith has found a resting\nplace,\nNot in device nor creed;\nI trust the Ever-living one,\nHis wounds for me shall plead.\nChorus\nI need no other argument\nI need no other plea\nIt is enough that Jesus died\nAnd that he died for me\n2. Enough for me that Jesus saves,\nThis ends my fear and doubt;\nA sinful soul I come to him\nHe'll never cast me out\n3. My heart is leaning on the word,\nThe written word of God,\nSalvation by my saviour's name,\nSalvation through his blood.\n4. My great Physician heals the\nsick\nThe lost he came to save:\nFor me His precious blood he\nshed,\nFor me His life he gave\nR.H 377, L.H.E'dmonds"
  },
  {
    "id": "english-42",
    "language": "english",
    "languageLabel": "English",
    "number": 42,
    "title": "Blessed assurance, Jesus is mine!",
    "lyrics": "1. Blessed assurance, Jesus is\nmine!\nOh, what a foretaste of glory\ndivine!\nHeir of salvation, purchase of\nGod,\nBorn of his spirit, washed in his\nblood\nChorus\nThis is my story, this is my song\nPraising my saviour all the day\nlong\n2. Perfect submission, prefect\ndelight,\nVisions of rapture now burst on\nmy Sight,\nAngels descending, bring from\nAbove\nEchoes of mercy, whispers of\nlove\n3. Prefect submission, all is at rest\nI in my saviour am happy and\nblest\nWatching and waiting, looking\nAbove\nFilled with his goodness, lost in\nhis love\nRH 370, Fanny J. Crosby"
  },
  {
    "id": "english-43",
    "language": "english",
    "languageLabel": "English",
    "number": 43,
    "title": "Through the love of God our saviour",
    "lyrics": "1. Through the love of God our\nsaviour,\nAll will be well;\nFree and changeless is his favour,\nAll, all is well\nPrecious is the blood that healed\nus;\nPerfect is the grace that sealed\nus\nStrong the hand stretched forth\nto Shield us\nAll must be well.\n2. Though we pass through\ntribulation,\nAll will be well\nOurs is such a full salvation ,\nAll, all is well\nHappy still in God confiding,\nFruitful if in Christ abiding;\nHoly through the spirit's\nguiding;\nAll must be well\n3. We expect a bright tomorrow\nAll will be well;\nFaith can sing through days of\nsorrow\nAll, all is well\nOn our father's love relying,\nJesus every need supplying\nOr in living or in dying\nAll must be well.\nRH.372"
  },
  {
    "id": "english-44",
    "language": "english",
    "languageLabel": "English",
    "number": 44,
    "title": "My hope is built on nothing less Than Jesus' blood and",
    "lyrics": "1. My hope is built on nothing less\nThan Jesus' blood and\nrighteousness\nI dare not trust the sweetest frame,\nBut wholly lean on Jesus' name.\nChorus\nOn Christ, the solid rock, I stand;\nAll other ground is sinking sand\n2. When darkness seems to veil\nhis face;\nI rest on his unchanging grace;\nIn every high and stormy gale,\nMy anchor holds within the veil.\n3. His oath, his covenant, and blood,\nSupport one in the 'whelming\nflood;\nWhen all around my soul gives\nway,\nHe then is all my hope and stay.\n4. When he shall come with\ntrumpet sound.\nOh, may I then in him be found:\nDressed in his righteousness\nalone,\nFaultless to stand before the\nthrone."
  },
  {
    "id": "english-45",
    "language": "english",
    "languageLabel": "English",
    "number": 45,
    "title": "Jesus, let me ever be Firmly grounded upon thee",
    "lyrics": "1. Jesus, let me ever be\nFirmly grounded upon thee\nEver in thy work abide,\nEver in thy wounds reside.\n2. Plant, and root, and fix in me\nAll the mind that was in thee;\nSettled peace I then shall find;\nJesu's is a quiet mind.\n3. Anger I no more shall feel,\nAlways even, always still\nMeekly on my God reclined\nJesu's is a gentle mind.\n4. I shall suffer and fulfil\nAll my father's gracious will,\nBe in all alike resigned;\nJesu's is  a patient mind\n5. When ‘tis deeply rooted here;\nPerfect love shall cast our fear,\nFear doth servile spirits bind,\nJesu’s is a noble mind.\n6. I shall nothing know beside\nJesus, and Him crucified;\nPerfectly to Him be joined\nJesu’s is a loving mind\n7. I shall triumph evermore,\nGrateful my God adore\nGod so good, so true, so kind,\nJesu’s is a thankful mind.\n8. Lowly, loving, meek and pure\nI shall to the end endure\nBe no more to sin inclined;\nJesu’s is a constant mind.\n9. I shall fully be restored\nto the image of my Lord,\nwitnessing to all mankind,\nJesu’s is a perfect mind\nCharles Wesley"
  },
  {
    "id": "english-46",
    "language": "english",
    "languageLabel": "English",
    "number": 46,
    "title": "Onward Christian soldiers, Marching as to war",
    "lyrics": "1.  Onward Christian soldiers,\nMarching as to war,\nLooking unto Jesus\nWho is gone before\nChrist, the Royal Master\nLeads against the foe;\nForward into battle\nSee His banners go\nChorus\nOnward Christian Soldiers!\nMarching as to War\nLooking unto Jesus,\nWho is gone before.\n2. At the name of Jesus\nSatan’s host doth flee;\nOn then, Christian soldiers\nOn to Victory!\nHell’s foundations quiver\nAt the shout of praise\nBrothers, lift your voices\nLoud your anthems raise.\n3. Like a mighty army\nMoves the church of God;\nBrothers, we are treading\nWhere the saints have trod,\nWe are not divided\nAll one body we\nOne in hope and doctrine\nOne in charity.\n4. Crowns and thrones may perish\nKingdoms rise and wane,\nBut the Church of Jesus\nConstant will remain\nGates of hell can never\n‘Gainst that church prevail;\nWe have Christ’s own promise\nand that cannot fail.\n5. Onward then, ye people\nJoin our happy throng\nBlend with ours your voices\nIn the triumph song\n“Glory, praise and honour,\nUnto Christ the King”\nThis, through countless ages,\nMen and angels sing.\nRH 429 S. Baring-Gould"
  },
  {
    "id": "english-47",
    "language": "english",
    "languageLabel": "English",
    "number": 47,
    "title": "Stand up! Stand up for Jesus Ye soldiers of the cross",
    "lyrics": "1. Stand up! Stand up for Jesus\nYe soldiers of the cross;\nLift high His royal banner\nIt must not suffer loss,\nFrom vict’ry unto vict’ry\nHis army shall he lead\nTill every foe is vanquished,\nAnd Christ is Lord indeed.\n2. Stand up! Stand up for Jesus!\nThe trumpet call obey;\nForth to the mighty conflict,\nIn this His glorious day;\nYe that are men now serve Him\nAgainst unnumbered foes;\nLet courage rise with danger,\nAnd strength to strength\noppose.\n3. Stand up! Stand up for Jesus!\nStand in His strength alone;\nThe arm of flesh will fail you,\nYe dare not trust your own,\nPut on the gospel armour,\nAnd watching unto prayer;\nWhere duty calls, or danger,\nBe never wanting there.\n4. Stand up! Stand up for Jesus!\nThe strife will not be long;\nThis day the noise of battle\nThe next the victor’s song;\nTo him that overcometh,\nA crown of life shall be;\nHe with the king of  glory\nShall reign eternally.\nRH 438 G . Duffield"
  },
  {
    "id": "english-48",
    "language": "english",
    "languageLabel": "English",
    "number": 48,
    "title": "To God be the glory Great things He hath done",
    "lyrics": "1. To God be the glory\nGreat things He hath done,\nSo loved he the world that He\ngave us His son\nWho yielded His life an\natonement for sin\nAnd opened the Life Gate that\nall may go in\nChorus\nPraise the Lord, Praise the Lord\nLet the earth hear His voice\nPraise the lord, Praise the lord\nLet the people rejoice;\nO come to the Father through\nJesus the Son\nAnd give Him the glory, great\nthings he hath done.\n2. O perfect redemption, the\npurchase of blood\nTo every believer the promise of\nGod;\nThe vilest offender who trul\nbelieves;\nThat moment from Jesus a pardon\nreceived.\n3. Great things He hath taught us,\nGreat things He hath done,\nAnd great our rejoicing through\nJesus the Son\nBut purer, and higher, and greater\nwill be\nOur wonder, our transport when\nJesus we see\nRH. 47 Fanny  J. Crosby"
  },
  {
    "id": "english-49",
    "language": "english",
    "languageLabel": "English",
    "number": 49,
    "title": "Now thank we all our God. With hearts, and hands, and",
    "lyrics": "1. Now thank we all our God.\nWith hearts, and hands, and\nvoices;\nWho wondrous things hath\ndone\nIn whom His world rejoices;\nWho, from our mothers’ arms\nHath blessed us on our way\nWith countless gifts of love\nAnd still is ours to-day\n2. O may this bounteous God\nThrough all our life be near us,\nWith ever-joyful hearts\nAnd blessed peace to cheer us,\nAnd keep us in His grace,\nAnd guide us when perplexed,\nAnd free us from all ills\nIn this world and the next\n3. All praise and thanks to God\nThe Father now be given,\nThe Son, and Him who reigns\nWith them in highest heaven\nThe one, eternal God\nWhom earth and heaven adore;\nFor thus it was, is now\nAnd shall be evermore.\nRH 50, Martin Rincart\nTrans: Catherine Winkworth"
  },
  {
    "id": "english-50",
    "language": "english",
    "languageLabel": "English",
    "number": 50,
    "title": "Pleasant are Thy courts above, In the land of light and love",
    "lyrics": "1. Pleasant are Thy courts above,\nIn the land of light and love;\nPleasant are Thy court below\nIn this land of sin and woe,\nOh, my spirit longs and faints\nFor the converse of Thy Saints\nFor the brightness of Thy face\nFor Thy fullness, God of Grace!\n2. Happy birds that sing and fly\nRound Thy altars, O Most High!\nHappier souls that find a rest\nIn a heavenly Father’s breast!\nLike the wandering dove that\nfound\nNo repose on earth around\nThey can to their ark repair\nAnd enjoy it ever there.\n3. Happy souls! Their praises flow\nEven in this vale of woe;\nWaters in the desert rise,\nManna feeds them from the skies\nOn they go from strength to\nstrength\nTill they reach Thy throne at\nlength;\nAt Thy feet adoring fall,\nWho hast led them safe through\nall.\n4. Lord, be mine this prize to win\nGuide me through a world of sin;\nKeep me by Thy saving grace;\nGive me at Thy side a place\nSun and shield alike Thou art;\nGuide and guard my erring\nheart;\nGrace and glory flow from Thee;\nShower, Oh shower them, Lord\non me!\nRH. 100, H.F . Lyte"
  },
  {
    "id": "english-51",
    "language": "english",
    "languageLabel": "English",
    "number": 51,
    "title": "When I look into your holiness When I gaze into your loveliness",
    "lyrics": "When I look into your holiness\nWhen I gaze into your loveliness\nWhen all things that surround\nBecome shadows in the light of you!\nWhen I found the joy of reaching\nyour heart\nWhen my heart become enthroned\nin your love,\nWhen all things that surround,\nBecome shadows in the light of you\nI worship you, I worship you\nThe reason I live is to worship you\nI worship you, I worship you\nThe reason I live is to worship you"
  },
  {
    "id": "english-52",
    "language": "english",
    "languageLabel": "English",
    "number": 52,
    "title": "A greater rain is coming A greater rain is coming",
    "lyrics": "1. A greater rain is coming\nA greater rain is coming\nA greater rain is coming very\nsoon\nThe early and the latter rain\nshall fall together at the time\nA greater rain is coming very\nsoon\n2. I see the signs are all around\nMy ear has heard a certain sound\nA greater rain is coming very\nsoon\nFor Zion has travailed and shall\nbring forth\nThe sons of God with a word in\ntheir mouth\nA greater rain is coming very\nsoon\nPH. 35"
  },
  {
    "id": "english-53",
    "language": "english",
    "languageLabel": "English",
    "number": 53,
    "title": "Land of our Birth, we pledge to thee",
    "lyrics": "1. Land of our Birth, we pledge to\nthee\nOur love and toil in the year to be;\nWhen are grown, and take our\nplace\nAs men and women with our race.\n2. Father in heaven, who lovest all\nO help thy children when they\ncall;\nThat they may build from age to\nage\nAnd undefiled heritage.\n3. Teach us to bear the yoke in youth\nWith steadfastness and careful\ntruth\nThat, in our time, Thy grace may\ngive\nThe truth whereby the nations\nlive.\n4. Teach us to rule ourselves alway\nControlled and cleanly night and\nday;\nThat we may bring if need arise\nNo maimed or worthless  sacrifice.\n5. Teach us to look, in all our ends,\nOn Thee for Judge, and not our\nfriends;\nThat we, with Thee may walk\nuncowed\nBy fear or favour of the crowd.\n6. Teach us the strength that\ncannot seek\nBy deed or thought to hurt the weak\nThat, under Thee, we may\npossess\nMan’s strength to succour\nman’s distress\n7. Teach us delight in simple\nthings\nAnd mirth that has no bitter\nsprings;\nForgiveness free of evil done\nAnd love to all men ‘neath the\nsun!\n8. Land of our Birth, our faith, our\npride\nFor whose dear sake our fathers\ndied;\nO Motherland, we pledge to thee\nHead, heart, and hand through\nthe years to be\nMHB 899"
  },
  {
    "id": "english-54",
    "language": "english",
    "languageLabel": "English",
    "number": 54,
    "title": "God sent His Son, they called him Jesus",
    "lyrics": "1. God sent His Son, they called\nhim Jesus\nHe came to love, heal and forgive\nHe lived and died to buy my\npardon\nAn empty grave is there to prove\nMy Saviour lives.\nChorus\nBecause He lives, I can face\ntomorrow\nBecause He lives all fear is gone\nBecause I know He holds the\nfuture because He lives.\nAnd life is worth the living just\nbecause He lives\n2. How sweet to hold a new born baby\nAnd feel the pride and joy he\ngives\nBut greater still the calm assurance\nThis child can face uncertain days\nbecause He lives.\n3. And then one day I’ll cross the\nriver;\nI’ll fight life’s final war with pain;\nAnd then as death gives way to\nvict’ry\nI’ll see the lights of glory and\nI’ll know He lives."
  },
  {
    "id": "english-55",
    "language": "english",
    "languageLabel": "English",
    "number": 55,
    "title": "Bless the Lord, O my soul Bless the Lord, O my soul",
    "lyrics": "Bless the Lord, O my soul\nBless the Lord, O my soul\nAnd all that is within me bless His\nholy name\nBless the Lord, O my soul,\nBless the Lord, O my soul,\nAnd all that is within me bless His\nholy name.\nKing of Kings\nForever and ever\nLord of Lords\nFor ever and ever\nKing of Kings\nFor ever and ever;\nKing of Kings; and\nLord of Lords."
  },
  {
    "id": "english-56",
    "language": "english",
    "languageLabel": "English",
    "number": 56,
    "title": "“Great is Thy faithfulness” O God my Father",
    "lyrics": "1. “Great is Thy faithfulness”\nO God my Father\nThere is no shadow of turning with\nThou changest not,\nThy compassion they fail not\nAs Thou hast been Thou forever\nwill be.\nChorus\nGreat is Thy faithfulness!\nGreat is Thy faithfulness!\nMorning by morning new mercies\nI see\nAll I have needed Thy hand hath\nprovided\nGreat is Thy faithfulness, Lord\nunto me!\n2. Summer and winter and spring\ntime and harvest\nSun, moon and stars in their\ncourses above\nJoin with all nature in manifold\nwitness\nTo Thy great faithfulness, mercy\nand love\n3. Pardon for sin and a peace that\nendureth\nThy own dear presence to cheer\nand to guide\nStrength for today and bright hope\nfor tomorrow\nBlessings all mine, with ten\nthousand beside."
  },
  {
    "id": "english-57",
    "language": "english",
    "languageLabel": "English",
    "number": 57,
    "title": "Jesus Name above all names Beautiful saviour glorious Lord",
    "lyrics": "Jesus Name above all names\nBeautiful saviour glorious Lord\nEmmanuel, God is with us\nBlessed Redeemer, Living Word\n“Emmanuel, Emmanuel\nHis Name is called Emmanuel” (2)"
  },
  {
    "id": "english-58",
    "language": "english",
    "languageLabel": "English",
    "number": 58,
    "title": "Spirit of the living God Fall afresh on me",
    "lyrics": "Spirit of the living God\nFall afresh on me\nSpirit of the Living God\nFall afresh on me\nMelt me, mould me,\nfill me, Use me\nSpirit of the Living God\nFall afresh on me."
  },
  {
    "id": "english-59",
    "language": "english",
    "languageLabel": "English",
    "number": 59,
    "title": "Smile, my brother, smile Though the days be long",
    "lyrics": "Smile, my brother, smile\nThough the days be long\nSmile, my brother, smile\nLet your heart be strong\nDark are the days we are passing\nthrough\nI know a friend who will keep you\nthrough\nAnd He’ll lead you all the while\nAnd you’ll smile, smile smile.\nPH 80"
  },
  {
    "id": "english-60",
    "language": "english",
    "languageLabel": "English",
    "number": 60,
    "title": "As the deer panteth for the waters",
    "lyrics": "1. As the deer panteth for the waters\nSo my soul panteth after Thee\nYou alone are my hearts Desire\nAnd  I long to worship you.\nYou alone are my strength and\nshield\nTo you alone may my spirit yield\nYou alone are my heart’ s desire\nAnd I long to worship you.\n2. I want you more than gold or\nsilver\nOnly you can satisfy\nYou alone are the real joy giver\nAnd the apple of my eye.\n3. You are my friend and you are\nmy brother\nEven though you are a King\nI love you more than any other\nso much more than anything."
  },
  {
    "id": "english-61",
    "language": "english",
    "languageLabel": "English",
    "number": 61,
    "title": "Captain of Israel’s host, and guide",
    "lyrics": "1. Captain of Israel’s host, and guide\nOf all who seek the land above,\nBeneath thy shadow we abide\nThe cloud of thy protecting love\nOur strength, thy grace our rule\nthy word\nOur end, the glory of the Lord\n2. By thine unerring spirit led,\nWe shall not in the desert stray;\nWe shall not full direction need,\nNor miss our providential way\nAs far from danger, as from fear\nWhile love, Almighty love is\nnear.\nMHB 608, Charles Wesley"
  },
  {
    "id": "english-62",
    "language": "english",
    "languageLabel": "English",
    "number": 62,
    "title": "The church’s one foundation Is Jesus Christ, her Lord",
    "lyrics": "1. The church’s one foundation\nIs Jesus Christ, her Lord;\nShe is his new creation\nBy water and the word;\nFrom heaven he came and\nsought her\nTo be his holy bride\nWith his own blood he bought\nher\nAnd for her life he died\n2. Elect from every nation\nYet one o’er all the earth\nHer charter of salvation\nOne Lord, one faith, one birth:\nOne holy name she blesses\nPartakes one holy food\nAnd to one hope she presses\nWith every grace endured.\n3. Though with a scornful wonder\nMen see her sore oppressed\nBy schisms rent asunder,\nBy heresies distressed,\nYet saints their watch are keeping\nTheir cry goes up ‘How long’?\nAnd soon the night of weeping\nShall be the morn of songs\n4. ‘Mid toil, and tribulation,\nand tumult of her war\nShe waits the consummation\nOf peace for evermore;\n‘Till with the vision glorious\nHer longing eyes are blest\nAnd the great Church victorous\nShall be the Church at rest.\n5. Yet she  on earth hath union\nWith God the three in One\nAnd mystic sweet communion\nWith those whose rest is won\nO happy ones and holy!\nLord, give us grace that we,\nLike them, the meek and lowly\nOn high may dwell with thee.\nRH 682, Samuel John Stone"
  },
  {
    "id": "english-63",
    "language": "english",
    "languageLabel": "English",
    "number": 63,
    "title": "In Times Like These You need a Saviour",
    "lyrics": "In Times Like These\nYou need a Saviour\nIn times like these\nYou need an Anchor\nBe very sure\nBe very sure\nYour anchor holds\nAnd grips the solid Rock\nThis Rock is Jesus\nYes He’s the One\nThis Rock is Jesus\nThe only one\nBe very sure\nBe very sure\nYour anchor holds\nAnd grips the solid Rock"
  },
  {
    "id": "english-64",
    "language": "english",
    "languageLabel": "English",
    "number": 64,
    "title": "There is a fountain filled with blood",
    "lyrics": "1. There is a fountain filled with\nblood\nDrawn from Emmanuel’s veins.\nAnd sinners plunged beneath\nthat flood\nLose all their guilty stains.\n2. The dying thief rejoiced to see\nThat fountain in his day;\nAnd there may I, though vile as\nhe\nWash all my sins away.\n3. I do believe, I will believe,\nThat Jesus died for me\nThat on the cross He shed His\nblood\nFrom sin to set me free.\n4. Dear dying Lamb!\nThy precious blood\nShall never lose his power,\nTill all the ransomed church of\nGod\nBe saved to sin no more\n5. E’er since by faith I saw the\nstream\nThy flowing wounds supply,\nRedeeming love has been my theme,\nAnd shall be till I die\nRH 335, William Cowper"
  },
  {
    "id": "english-65",
    "language": "english",
    "languageLabel": "English",
    "number": 65,
    "title": "I need Thee e’er hour Most gracious Lord",
    "lyrics": "1. I need Thee e’er hour\nMost gracious Lord;\nNo tender voice like Thine\nCan peace afford\nI need Thee, Oh I need Thee\nEv’ry hour I need Thee;\nOh, bless me now, my saviour\nI come to Thee!\n2. I need Thee every hour\nStay Thou near by;\nTemptations lose their power,\nWhen thou art nigh\n3. I need Thee every hour\nIn joy or pain;\nCome quickly and abide,\nOr life is vain.\n4. I need Thee every hour\nTeach me Thy will\nAnd Thy rich promises\nIn me fulfil."
  },
  {
    "id": "english-66",
    "language": "english",
    "languageLabel": "English",
    "number": 66,
    "title": "All to Jesus I surrender All to Him I freely give",
    "lyrics": "1. All to Jesus I surrender\nAll to Him I freely give;\nI will ever love and trust Him,\nIn His presence daily live\nI surrender all...\nI surrender all...\nAll to Thee, my blessed Saviour\nI surrender all.\n2. All to Jesus I surrender\nHumbly at His feet I bow\nWorldly pleasures all forsaken,\nTake me Jesus, take me now.\n3. All to Jesus I surrender\nLord, I give myself to thee;\nFill me with Thy love and power\nLet Thy blessing fall on me\n4. All to Jesus I surrender all\nNow I feel the sacred flame;\nO the joy of full salvation!\nGlory, glory to His Name!\nJ. Van de Venter, RH 600"
  },
  {
    "id": "english-67",
    "language": "english",
    "languageLabel": "English",
    "number": 67,
    "title": "O happy day, that fixed my choice On Thee, my Saviour and my God!",
    "lyrics": "1. O happy day, that fixed my choice\nOn Thee, my Saviour and my God!\nWell may this glowing heart\nrejoice\nAnd tell its raptures all abroad\nChorus\nHappy day, happy day\nWhen Jesus washed my sins\naway!\nHe taught me how  to watch\nand pray\nAnd live rejoicing ev’ry day.\nHappy day, happy day\nWhen Jesus washed my sins\naway!\n2. ‘Tis done, the great\ntransaction’s done!\nI am my Lord’s and He is mine;\nHe drew me and I followed on\nCharmed to confess the choice\ndivine.\n3. Now rests my long-divided\nheart,\nFixed on this blissful centre,\nrest;\nNor ever from thy Lord depart\nWith Him of every good\npossessed\n4. High heaven, that heard the\nsolemn vow\nThat vow renewed shall daily\nhear,\nTill in life’s latest hour I bow\nAnd bless in death a bond so\ndear.\nRH 619 P. Doddridge."
  },
  {
    "id": "english-68",
    "language": "english",
    "languageLabel": "English",
    "number": 68,
    "title": "I was sinking deep in sin Sinking to rise no more",
    "lyrics": "1. I was sinking deep in sin\nSinking to rise no more,\nOverwhelmed by guilt within,\nMercy I did implore,\nThen the Master of the sea\nHead not despairing cry\nChrist my Saviour lifted me\nNow safe am I.\nChorus\nLove lifted me!... Love lifted me!..\nWhen no one but Christ could\nhelp\nLove lifted me.\n2. Souls in danger, look above\nJesus completely saves;\nHe will lift you by His love\nOut of the angry waves,\nHe’s the Masters of the sea\nBillows His will obey;\nHe your Saviour wants to be,\nBe saved today!\n3. When the waves of sorrow roll,\nWhen  I am in distress\nJesus takes my hand in His,\nEver He loves to bless,\nHe will every fear dispel\nSatisfy every need;\nAll who heed His loving call\nFind rest indeed\nRH 626 (Arranged)\nJames Rowe"
  },
  {
    "id": "english-69",
    "language": "english",
    "languageLabel": "English",
    "number": 69,
    "title": "Would you know why I love Jesus?",
    "lyrics": "1. Would you know why I love\nJesus?\nWhy He is so dear to me?\n‘Tis because my blessed\nSaviour\nFrom my sins has ransomed me.\nThis is why... I love my J...sus\nThis is why... I love Him so...\nHe has par ... doned\nmy transgress..sions\nHe has washed me... white as\nsnow\n2. Would you know why I love\nJesus\nWhy he is so dear to me?\n‘tis because the blood of Jesus\nFully saves and cleanses me.\n3. Would you know why I love\nJesus\nWhy He is so dear to me?\n‘Tis because, amid temptation,\nHe supports and strengthens\nme.\n4. Would you know why I love\nJesus\nWhy he is so dear to me?\n“Tis because, in ev’ry conflict.\nJesus gives me victory.\n5. Would you know why I love\nJesus\nWhy he is so dear to me?\n‘Tis because my Friend and\nSaviour\nHe will ever, ever be.\nRH 645, E.A. Hoffmonn"
  },
  {
    "id": "english-70",
    "language": "english",
    "languageLabel": "English",
    "number": 70,
    "title": "I am so glad that our father in heaven",
    "lyrics": "1. I am so glad that our father in\nheaven\nTells of His love in the Book He\nhas given\nWonderful things in the Bible I\nsee;\nThis is the dearest, that Jesus\nloves me.\nI am so glad that Jesus loves me,\nI am so glad that Jesus loves me,\nI am so glad that Jesus loves me,\nJesus loves even me.\n2. Jesus loves me and I know I\nlove Him\nLove brought Him down my lost\nsoul to redeem;\nYes, it was love made Him die\non the tree.\nOh, I am certain that Jesus loves me.\n3. In this assurance I find sweetest\nrest\nTrusting in Jesus I know I am\nblest;\nSatan dismayed from my soul\ndoth now flee\nWhen I just tell him that Jesus\nloves me.\n4. Oh, if there’s only one song I\ncan sing,\nWhen in His beauty I see the\ngreat King,\nThis shall my song in eternity\nbe,\n‘Oh, what a wonder that Jesus\nloves me!”\n5. If one should ask of me, how\ncan I tell\nGlory to Jesus, I know very well\nGod’s Holy Spirit with mine doth\nagree,\nConstantly witnessing-Jesus\nloves me.\nRH 670, PP . Bliss"
  },
  {
    "id": "english-71",
    "language": "english",
    "languageLabel": "English",
    "number": 71,
    "title": "Go, Labour on, spend, and be spent",
    "lyrics": "1. Go, Labour on, spend, and be\nspent\nThy joy to do the Father’s will;\nIt is the way the Master went,\nShould not the servant tread it\nsill?\n2. Go, Labour on, ‘tis not for\nnought,\nThy earthly loss is heavenly\ngain\nMen heed thee, love thee, praise\nthee not\nThe Master praises, what are men?\n3. Go labour on, while it is day;\nThe world’s dark night is\nhastening on\nSpeed, speed thy work cast\nsloth away;\nIt is not thus that souls are won.\n4. Men die in darkness at your side\nWithout a hope to cheer the\ntomb;\nTake up the torch, and wave it\nwide,\nThe torch that lights time’s\nthickest gloom\n5. Toil on, faint not, keep watch,\nand pray\nBe wise, the erring soul to win;\nGo forth into the world’s\nhighway,\nCompel the wanderer to come in.\n6. Toil on, and in thy toil rejoice;\nFor toil comes rest, for exile\nhome\nSoon shalt thou hear the\nBridegroom’s voice\nThe midnight peal: “Behold I\ncome!”\nRH 687, Horartius Bonor"
  },
  {
    "id": "english-72",
    "language": "english",
    "languageLabel": "English",
    "number": 72,
    "title": "Crucified with Christ, Crucified with him",
    "lyrics": "Crucified with Christ,\nCrucified with him,\nNailed upon the tree, sanctified\nfrom sin;\nYet not I but Christ lives to glorify;\nBy the faith of His dear Son,\ncrucified with Him\nPH 61"
  },
  {
    "id": "english-73",
    "language": "english",
    "languageLabel": "English",
    "number": 73,
    "title": "The day Thou gavest, Lord is ended",
    "lyrics": "1. The day Thou gavest, Lord is\nended.\nThe darkness falls Thy behest;\nTo Thee our morning hymns\nascended\nThy praise shall sanctify our rest.\n2. We thank Thee that Thy church\nunsleeping\nWhile earth rolls onward into\nlight\nThrough all the world her watch\nis keeping\nAnd rests not now by day or\nnight.\n3. As o’er each continent and island\nThe dawn leads on another day.\nThe voice of prayer is never silent\nNor dies the strain of praise away.\n4. The sun that bids us rest is waking\nOur brethren ‘neath the western sky,\nAnd hour by hour fresh lips are\nmaking\nThy wondrous doings heard on\nhigh.\n5. So be it, Lord Thy throne shall\nnever,\nLike earth’s proud empires\npass away;\nThy kingdom stands and grows\nforever,\nTill all Thy creatures own thy sway.\nJohn Ellerton, RH 798"
  },
  {
    "id": "english-74",
    "language": "english",
    "languageLabel": "English",
    "number": 74,
    "title": "Tarry for the Spirit He shall come in showers",
    "lyrics": "1. Tarry for the Spirit\nHe shall come in showers,\nEnergising wholly\nAll your ransomed powers;\nSigns shall follow service\nIn the Holy Ghost,\nThen the Church of Jesus\nProve a mighty host\nOn, then, Church of Jesus\nClaim your Pentecost:\nGod shall now baptise thee\nIn the Holy Ghost\n2. Rivers is Thy promise,\nThis shall be our plea\nLess than this can never\nMeet our cry for Thee;\nTired of  lukewarm service,\nAnd the loss it brings\nWe would live entirely\nFor eternal things\n3. When the Spirit cometh\nLoosened lips shall tell,\nOf the wondrous blessing\nWhich upon them fell;\nLife of Jesus springing\nLike a well within\nHearts with loud hosannas\nConstantly shall ring.\n4. When with joy we follow\nIn Christ is triumph train,\nand our lives are flooded\nWith the Latter Rain;\nThen the world around us\nShall the impact feel,\nOf a Church with vision\nFired with holy zeal.\n5. Then the Lord of glory\nShall be magnified,\nHe who trod the winepress,\nfully satisfied:\nWalking in the Spirit,\nCondemnation o’er\nBlessed Life of worship,\nNow and evermore.\nRH 235, E.C.W Boulton"
  },
  {
    "id": "english-75",
    "language": "english",
    "languageLabel": "English",
    "number": 75,
    "title": "I'm rejoicing night and day As I walk the pilgrim way",
    "lyrics": "1. I'm rejoicing night and day\nAs I walk the pilgrim way,\nFor the hand of God in all my life\nI see,\nAnd the reason of my bliss;\nYes, the secret all is this:\nThat the comforter abides\nWith me\nHe abides…   he abides…\nHallelujah, he abides with me!\nI am rejoicing night and day,\nAs I walk the narrow way,\nFor the comforter abides with me\n2. Once my heart was full of sin,\nOnce I had no peace within\nTill I heard how Jesus died upon\nthe tree,\nThen I fell down at his feet,\nAnd there came a peace so\nsweet\nNow the comforter abides with\nme.\n3. He is with me everywhere,\nAnd he knows my every care,\nI'm as happy as a bird and just\nas free\nFor the spirit has control,\nJesus satisfies my soul,\nSince the comforter abides with me.\n4. There's no thirsting for the things\nOf the world - they've taken wings;\nLong ago I gave them up, and\ninstantly;\nAll my night was turned to day,\nAll my burdens rolled away,\nNow the comforter abides with me.\nRH.217Herbert Buffum"
  },
  {
    "id": "english-76",
    "language": "english",
    "languageLabel": "English",
    "number": 76,
    "title": "Rejoice, the lord is king, Your lord and king adore",
    "lyrics": "1. Rejoice, the lord is king,\nYour lord and king adore,\nMortals, give thanks and sing,\nAnd triumph evermore;\nLift up your heart; lift up your\nvoice,\nRejoice, again I say, rejoice!\n2. Jesus the saviour reigns,\nThe God of truth and love\nWhen he had purged our stains,\nHe took his seat above;\nLift up your heart; lift up your\nvoice,\nRejoice, again I say, rejoice!\n3. His kingdom cannot fail;\nHe rules o'er earth and heaven;\nThe keys of death and hell\nAre to our saviour given;\nLift up your heart; lift up your\nvoice,\nRejoice, again I say rejoice!\n3. Rejoice in glorious hope\nJesus the judge shall come,\nAnd take his servants up\nTo their eternal home\nWe soon shall hear the archangel's\nvoice\nThe trump of God shall sound,\nrejoice!\nRH.195 Charles Wesley"
  },
  {
    "id": "english-77",
    "language": "english",
    "languageLabel": "English",
    "number": 77,
    "title": "Low in the grave he lay... Jesus, my saviour!",
    "lyrics": "1. Low in the grave he lay...\nJesus, my saviour!\nWaiting the coming day-\nJesus, my lord!\nUp from the grave he arose…\nWith a mighty triumph o'er\nHis foes…..\nHe arose, a victor from the\ndark domain,\nAnd he lives forever with his\nsaints to reign\nHe arose!...\nHe arose! ..\nHallelujah! Christ arose!\n2. Vainly they watch his bed\nJesus, my saviour!\nVainly, they seal the dead\nJesus, my lord!\n3. Death cannot keep his prey\nJesus, my saviour!\nHe tore the bars away\nJesus, my lord!\nRH.186, Robert Lowry"
  },
  {
    "id": "english-78",
    "language": "english",
    "languageLabel": "English",
    "number": 78,
    "title": "\"Man of sorrows\", what a name! For the son of God who came",
    "lyrics": "1. \"Man of sorrows\", what a name!\nFor the son of God who came\nRuined sinners to reclaim!\nHallelujah! What a Saviour!\n2. Bearing shame and scoffing rude,\nIn my place condemned he stood;\nSealed my pardon with his blood;\nHallelujah! What a saviour!\n3. Guilty, vile and helpless we,\nSpotless lamb of God was he;\n\"Full atonement, can it be?\nHallelujah! What a saviour!\n4. Lifted up was he to die,\n\"It is finished\" was his cry;\nNow in heaven exalted high;\nHallelujah! What a saviour!\n5. When he comes, our glorious King.\nAll his ransomed home to bring,\nThen anew this song we'll sing;\nHallelujah! What a saviour!\nRH 170, P P Bliss"
  },
  {
    "id": "english-79",
    "language": "english",
    "languageLabel": "English",
    "number": 79,
    "title": "There is a Name I love to hear, I love to sing its worth",
    "lyrics": "1. There is a Name I love to hear,\nI love to sing its worth,\nIt sounds like music in mine ear,\nThe sweetest  name on earth.\nOh how I love Jesus\nOh how I love Jesus\nOh how I love Jesus\nBecause he first loved me\n2. It tells of a Saviour's love,\nWho died to set me free,\nIt tells me of his precious blood,\nThe sinner's perfect plea\n3. It bids my trembling soul rejoice,\nAnd dries each rising tear,\nIt tells me in a 'still small voice \"\nTo trust and never fear.\n4. Jesus, the name I love so well,\nThe name I love to hear,\nNo saints on earth its worth can\ntell,\nNo heart conceive how dear.\n5. This name shall shed its fragrance\nstill\nAlong this thorny road\nShall sweetly smooth the rugged\nhill\nThat leads me up to God.\n6. And there, with all the\nBlood -bought throng\nFrom sin and sorrow free,\nI'll sing the new eternal song\nOf Jesus' love to me.\nRH .156, Frederick Whiffield"
  },
  {
    "id": "english-80",
    "language": "english",
    "languageLabel": "English",
    "number": 80,
    "title": "Let us with a gladsome mind Praise the Lord for He is kind",
    "lyrics": "1. Let us with a gladsome mind\nPraise the Lord for He is kind;\nFor His mercies shall endure,\never faithful, ever sure\n2. Let us sound His name abroad\nFor of gods He is The God;\n3. He, with all-commanding might,\nFilled the new-made world with\nlight;\n4. All things living He doth feed,\nHis full hand supplies their\nneed;\n5. He His chosen race did bless\nIn the wasteful wilderness;\n6. He hath with a piteous eye\nLooked upon our misery.\n7. Let us then with gladsome mind\nPraise the Lord, for He is kind.\nRH 109-John Milton"
  },
  {
    "id": "english-81",
    "language": "english",
    "languageLabel": "English",
    "number": 81,
    "title": "O God, our help in ages past, Our hope for years to come",
    "lyrics": "1. O God, our help in ages past,\nOur hope for years to come,\nOur shelter from the stormy blast\nAnd our eternal home.\n2. Under the shadow of Thy throne\nThy saints have dwelt secure;\nSufficient is Thine arm alone,\nAnd our defence is sure.\n3. Before the hills in order stood\nOr earth received her frame\nFrom everlasting Thou art God\nTo endless year the same.\n4. A thousand ages in Thy sight\nAre like an evening gone,\nShort as the watch that ends the\nnight\nBefore the rising sun.\n5. The busy tribes of flesh and blood\nWith all their cares and fears,\nAre carried downward by the\nflood,\nAnd lost in following  years.\n6. Time like an ever rolling stream,\nBears all its sons away;\nThey fly forgotten, as a dream\nDies at the opening day.\n7. O God, our help in ages past,\nOur hope for years to come,\nBe thou our guard while\ntroubles last\nAnd our eternal home.\nRH. 104, Isaac Watts"
  },
  {
    "id": "english-82",
    "language": "english",
    "languageLabel": "English",
    "number": 82,
    "title": "The Lord’s my Shepherd, I’ll not want",
    "lyrics": "1. The Lord’s my Shepherd, I’ll not\nwant\nHe makes me down to lie\nIn pastures green; he leadeth me\nThe quiet waters by.\n2. My soul he doth restore again ;\nAnd me to walk doth make\nWithin the paths of\nrighteousness,\nE’en for His own name’s sake.\n3. Yea, though I walk in death’s\ndark vale,\nYet will I fear none ill;\nFor Thou art with me; and Thy rod\nAnd staff me comfort still.\n4. My Table Thou has furnished\nIn presence of my foes;\nMy head Thou dost with oil\nanoint\nAnd my cup over flows\n5. Goodness and mercy all my life\nShall surely follow me,\nAnd in God’s house for ever more\nMy dwelling place shall be\nRH 99, Whirringham and Rous"
  },
  {
    "id": "english-83",
    "language": "english",
    "languageLabel": "English",
    "number": 83,
    "title": "Jesus, stand among us In Thy risen power",
    "lyrics": "1. Jesus, stand among us\nIn Thy risen power,\nLet this time of worship\nBe a hallowed hour\n2. Breath Thy Holy Spirit\nInto every heart;\nBid the fears and sorrows\nFrom each soul depart\n3. Thus with quickened footsteps\nWe’ll pursue our way,\nWatching for the dawning\nOf eternal day\nRH 65 W. Pennefaher"
  },
  {
    "id": "english-84",
    "language": "english",
    "languageLabel": "English",
    "number": 84,
    "title": "Revive Thy work, O Lord Thy mighty arm make bare",
    "lyrics": "1. Revive Thy work, O Lord\nThy mighty arm make bare;\nSpeak with the voice that wakes\nthe dead,\nAnd make Thy people hear!\nChorus\nRevive Thy work, O Lord\nWhile here to Thee we bow;\nDescend, O gracious Lord\ndescend,\nOh, come and bless us now!\n2. Revive Thy work, O Lord!\nDisturb this sleep of death;\nQuicken the smouldering\nembers now.\nBy Thine Almighty breath.\n3. Revive Thy work, O Lord!\nCreate soul-thirst for Thee;\nAnd hungering for the bread of life,\nOh may our spirit be!\n4. Revive Thy work, O Lord!\nExalt Thy precious name,\nAnd by the Holy Ghost, our\nlove\nFor Thee and Thine in-flame\nRH 246, Albert Midlane Err:\nF .J. Crosby"
  },
  {
    "id": "english-85",
    "language": "english",
    "languageLabel": "English",
    "number": 85,
    "title": "Everybody ought to love Him, Everybody, everywhere",
    "lyrics": "Everybody ought to love Him,\nEverybody, everywhere;\nEverybody ought to love Him,\nHe will banish every care;\nHe’s the author of salvation,\nCondemnation He did bare\nJesus died for every nation\nEverybody, everywhere.\nPH. 3, H. Mitchell & L McPherson"
  },
  {
    "id": "english-86",
    "language": "english",
    "languageLabel": "English",
    "number": 86,
    "title": "Lord Thy Word abideth And our footsteps guideth",
    "lyrics": "1. Lord Thy Word abideth\nAnd our footsteps guideth,\nWho its truth believeth\nLight and joy receiveth\n2. When our foes are near us\nThen Thy Word doth cheer us,\nWord of consolation,\nMessage of salvation.\n3. When the storms are o’er us,\nAnd dark clouds before us,\nThen its light directeth,\nAnd our way protecteth.\n4. Who can tell the pleasure,\nWho recount the treasure,\nBy Thy word imparted\nTo the simple-hearted?\n5. Word of mercy, giving\nSuccour to the living\nWord of life, supplying\nComfort to the dying!\n6. O that we, discerning\nIts most holy learning,\nLord, may love and fear Thee,\nEvermore be near Thee!\nRH 262, H. W. Baker"
  },
  {
    "id": "english-87",
    "language": "english",
    "languageLabel": "English",
    "number": 87,
    "title": "I’ve a message from the Lord, Hallelujah!",
    "lyrics": "1. I’ve a message from the Lord,\nHallelujah!\nThe message unto you I’ll give,\nTis recorded in His word,\nHallelujah!\nIt is only that you “look and live”\n“Look and live” ... my brother\nlive ...\nLook to Jesus now and live\nTis recorded in His word,\nHallelujah!\nIt is only that you “look and\nlive”\n2. I’ve a message full of love\nHallelujah!\nA message, O my friend, for you.\n‘Tis a message from above\nHallelujah!\nJesus said it, and I know ‘tis true.\n3. Life is offered unto you,\nHallelujah!\nEternal life your soul shall have\nIf you’ll only look to Him\nHallelujah!\nLook to Jesus who alone can save.\nRH 299, W.A Ogden"
  },
  {
    "id": "english-88",
    "language": "english",
    "languageLabel": "English",
    "number": 88,
    "title": "I hear Thy welcome voice That calls me, Lord to Thee",
    "lyrics": "1. I hear Thy welcome voice\nThat calls me, Lord to Thee\nFor cleansing in Thy precious\nblood\nThat flowed on Calvary.\nI am coming Lord,\nComing now to Thee;\nTrusting only in the blood\nThat flowed on Calvary.\n2. Though coming weak and vile,\nThou dost my strength assure;\nThou dost my vileness fully\ncleanse,\nTill spotless all and pure.\n3. ‘Tis Jesus calls me on\nTo perfect faith and love,\nTo perfect hope, and peace and\ntrust\nFor earth and heaven above\n4. ‘Tis Jesus who confirms\nThe blessed work within,\nBy adding grace to welcomed\ngrace,\nWhere reigned the power of sin\n5. And He the witness gives\nTo loyal hearts and free\nThat every promise is fulfilled,\nIf faith but brings the plea.\n6. All hail, atoning blood!\nAll hail, redeeming grace!\nAll hail, the gift of Christ, our Lord,\nOur strength and righteousness!\nRH 311, L. Hartsough"
  },
  {
    "id": "english-89",
    "language": "english",
    "languageLabel": "English",
    "number": 89,
    "title": "Jesus, lover of my soul, Let me to Thy bosom fly",
    "lyrics": "1. Jesus, lover of my soul,\nLet me to Thy bosom fly,\nWhile the nearer waters roll,\nWhile the tempest still is high\nHide me, O my saviour, hide\nTill the storm of life is past\nSafe into the haven guide;\nOh, receive my soul at last.\n2. Other refuge have I none\nHangs my helpless soul on thee;\nLeave, ah! Leave me not alone,\nStill support and comfort me\nAll my trust on thee is stayed\nAll my help from Thee I bring;\nCover my defenceless head\nWith the shadow of Thy wing.\n3. Thou, O Christ! art all I want\nMore than all in thee I find;\nRaise the fallen, cheer the faint,\nHeal the sick, and lead the blind\nJust and holy is Thy name\nI am all unrighteousness;\nVile and full of sin I am,\nThou art full of truth and grace.\n4. Plenteous grace with thee is found\nGrace to cover all my sin;\nLet the healing streams abound\nMake and keep me pure within;\nThou of life the fountain art,\nFreely let me take of Thee;\nSpring Thou up within my heart\nRise to all eternity.\nRH. 312, Charles Wesley"
  },
  {
    "id": "english-90",
    "language": "english",
    "languageLabel": "English",
    "number": 90,
    "title": "Pass me not, O gentle Saviour Hear me humble cry",
    "lyrics": "1. Pass me not, O gentle Saviour\nHear me humble cry;\nWhile on others Thou art calling\nDo not pass me by\nSaviour , Saviour\nHear my humble cry;\nWhile on others Thou art calling.\nDo not pass me by\n2. Let me, at Thy throne of mercy\nFind a sweet relief,\nKneeling than in deep contrition\nHelp my unbelief.\n3. Trusting only in Thy merit\nwould I seek Thy face,\nHeal my wounded, broken merit\nSave me by Thy grace\n4. Thou, the spring of all my comfort,\nMore than life to me\nWhom have I on earth beside\nThee?\nWhom in heaven but Thee?\nRH 314, Fanny J. Crosby"
  },
  {
    "id": "english-91",
    "language": "english",
    "languageLabel": "English",
    "number": 91,
    "title": "If you would serve the lord a-right",
    "lyrics": "1. If  you would serve the lord a-right,\nSpend sometime in pray'r\nIf you would keep your armour\nbright\nSpend some time in pray'r\nChorus\nPray'r , its value none can\nmeasure,\nIt will bring you lasting treasure;\nSpend some time in pray'r\n2. If you would daily do his will,\nSpend sometime in pray'r.\nFor strength, his bidding to\nfulfil,\nSpend sometime in pray'r.\n3. For pow'r to run the Christian race,\nSpend some time in pray'r\nCome often  to the throne of grace,\nSpend some time in pray'r\n4. God only can your needs\nsupply,\nSpend some time in pray'r\nThe blessings cometh from on\nhigh,\nSpend some time in pray'r\nPH 301\nFaith Gospel Message"
  },
  {
    "id": "english-92",
    "language": "english",
    "languageLabel": "English",
    "number": 92,
    "title": "And can it be, that I should gain",
    "lyrics": "1. And can it be, that I should\ngain\nAn interesting in the saviour's\nblood?\nDied he for me, who caused his\npain?\nFor me, who him to death\npursued?\nAmazing love!how can it be\nThat thou, my God should die\nfor me?\n2. 'Tis mystery all! The immortal dies!\nWho can explore his strange\ndesign?\nIn vain the first born seraph tries\nTo sound the depth of love divine\n'Tis' mercy all let earth adore,\nLet angel-minds inquire no more.\n3. He left his father's throne above!\n(So free, so infinite his grace,)\nEmptied himself of all but love,\nAnd bled for Adam's helpless\nrace;\n'Tis mercy all, immense and free,\nFor, O my God , it found out me!\n4. Long my imprisoned spirit lay\nFast bound in sin and nature's\nnight;\nThine eye diffused a quickening\nray\nI woke, dungeon flamed with\nlight;\nMy chains fell off my heart was\nfree,\nI rose, went forth and followed\nthee.\n5.  No condemnation now I dread,\nJesus, and all in him, is mine;\nAlive in him, my living head,\nAnd clothed in righteousness divine,\nBold I approach the eternal throne,\nAnd claim the crown, through\nChrist my own\nRH 324, Charles Wesley"
  },
  {
    "id": "english-93",
    "language": "english",
    "languageLabel": "English",
    "number": 93,
    "title": "Rock of Ages, cleft for me, Let me hide myself in Thee!",
    "lyrics": "1. Rock of Ages, cleft for me,\nLet me hide myself in Thee!\nLet the water and the blood,\nFrom thy riven side which flowed,\nBe of sin the double cure;\nCleanse me from its guilt and\npower.\n2. Not the labours of my hands,\nCan fulfil thy law's demands;\nCould my zeal no respite know,\nCould  my tears for ever flow,\nAll of sin could not atone;\nThou must save and thou alone.\n3 Nothing in my hand I bring,\nSimply to thy cross I cling;\nNaked, come to thee for grace\nHelpless, look to thee for grace;\nFoul, I to the fountain fly;\nWash me, saviour, or I die.\n4 While I draw this fleeting breath\nWhen my eyelids close in death,\nWhen I soar to worlds\nunknown,\nSee thee on thy judgement\nthrone,\nRock of Ages , cleft for me,\nLet me hide myself in thee\nRH 341, A M Toplady"
  },
  {
    "id": "english-94",
    "language": "english",
    "languageLabel": "English",
    "number": 94,
    "title": "Jesus Keep me near the cross There a precious fountain",
    "lyrics": "1. Jesus Keep me near the cross\nThere a precious fountain,\nFree to all, a healing stream,\nFlows from calv'ry's mountain.\nIn the cross, (2)\nBe my glory ever,\nTill my raptured soul shall find\nRest beyond the river.\n2. Near the cross, a trembling soul,\nLove and mercy found me;\nThere the bright and morning\nstar\nShed its beams around me.\n3. Near the Cross! O Lamb of God,\nBring its scenes before me;\nHelp me walk from day to day,\nWith its shadow o’er me\n4. Near the cross I'll watch and wait,\nHoping, trusting ever,\nTill I reach the golden strand,\nJust beyond the river.\nRH. 396, Fanny J. Crosby"
  },
  {
    "id": "english-95",
    "language": "english",
    "languageLabel": "English",
    "number": 95,
    "title": "Hark, my soul, it is the lord; 'Tis thy saviour; hear his word",
    "lyrics": "1. Hark, my soul, it is the lord;\n'Tis thy saviour; hear his word;\nJesus speaks and speaks to thee;\n'Say, \"poor sinner, lov'st thou\nMe?\"\n2. I delivered thee when bound,\nAnd when bleeding, healed thy\nwound;\nSought thee wand'ring, set thee\nright,\nTurned thy darkness into light.\n3. \"Can a woman's tender care\nCease towards the child she bare?\nYes, she may forgetful be,\nYet will I remember thee.\n4. \"Mine is an unchanging love,\nHigher than the heights above,\nDeeper than the depths beneath,\nFree and faithful strong as death.\n5. Thou shall see My glory soon,\nWhen the work of grace is done;\nPartner of my throne shalt be;\nSay, \"poor sinner, lov'st thou\nMe?\"\n6. Lord it is my chief complaint\nThat my love is weak and faint;\nYet I love thee, and adore;\nOh for grace to love thee more\nRH. 397, W. Cowper"
  },
  {
    "id": "english-96",
    "language": "english",
    "languageLabel": "English",
    "number": 96,
    "title": "Nearer, my God to thee, Nearer to thee",
    "lyrics": "1. Nearer, my God to thee,\nNearer to thee;\nE'en though it be a cross\nThat raiseth me,\nStill all my song shall be,\nNearer my God to thee,\nNearer to thee.\n2. Though, like the wanderer,\nThe sun gone down,\nDarkness be over me,\nMy rest a stone,\nYet in my dreams l'd be\nNearer, my God to thee,\nNearer to thee!\n3. There let the way appear\nSteps unto heaven;\nAll that thou send'st to me\nIn mercy given;\nAngels to beckon me\nNearer, my God, to thee\nNearer to thee!\n4. Then, with my waking thoughts\nBright with thy praise\nOut of my stony griefs\nBethel l'll raise;\nSo by my woes to be\nNearer, my God, to thee\nNearer to thee!\n5. Or if on joyful wing\nCleaving the sky,\nSun, moon, and stars forgot,\nUpwards I fly,\nStill all my songs shall be\nNearer, my God, to thee\nNearer to thee!\nRH. 400, Sarah F . Adams"
  },
  {
    "id": "english-97",
    "language": "english",
    "languageLabel": "English",
    "number": 97,
    "title": "Who is on the lord's side? Who will serve the king?",
    "lyrics": "1. Who is on the lord's side?\nWho will serve the king?\nWho will be his helpers?\nOther lives to bring?\nWho will leave the world's side?\nWho will face the foe?\nWho is on the Lord's side?\nWho for him will go?\nBy Thy call of mercy,\nBy Thy grace divine,\nWe are on the lord's side,\nSaviour, we are thine!\n2. Not for weight of glory,\nNot for crown and palm,\nEnter we the army\nRaise the warrior psalm;\nBut for love that claimeth\nLives for whom he died;\nHe whom Jesus nameth\nMust be on his side;\nBy thy love constraining\nBy thy grace divine\nWe are on the lord's side\nSaviour, we are thine!\n3. Jesus, thou hast bought us,\nNot with gold or gem,\nBut with thine own life-blood\nFor thy diadem;\nWith thy blessing filling\nAll who come to thee,\nThou hast made us willing\nThou hast made us free\nBy thy grand redemption.\nBy thy grace divine\nWe are on the Lord's side\nSaviour we are thine!\n3. Fierce may be the conflict,\nStrong may be the foe;\nBut the king's own many\nNone-can overthrow,\nRound his standard ranging,\nVictory is secure,\nFor his truth unchanging\nMakes the triumph sure,\nJoyfully enlisting,\nBy thy grace divine,\nWe are on the lord's side;\nSaviour, we are thine.\nRH. 431, Frances R Havergal"
  },
  {
    "id": "english-98",
    "language": "english",
    "languageLabel": "English",
    "number": 98,
    "title": "Fight the good with all thy might Christ is thy strength, and Christ",
    "lyrics": "1. Fight the good with all thy might\nChrist is thy strength, and Christ\nthy right\nLay hold on life and it shall be\nThy joy and crown eternally.\n2. Run the straight race through\nGod's good grace,\nLift thine eyes, and seek his\nface;\nLife with its way before thee lies,\nChrist is the path, and Christ thy\nprize\n3. Cast care aside, lean on thy Guide;\nHis boundless mercy will provide;\nLean and the trusting soul shall\nprove,\nChrist is its life, and Christ its love.\n4. Faint not, nor fear his arms are near,\nHe changeth not, and thou art\nsee\nOnly believe, and thou shalt see\nThat Christ is all in all to thee.\nRH 432, J.S.B. Monsell"
  },
  {
    "id": "english-99",
    "language": "english",
    "languageLabel": "English",
    "number": 99,
    "title": "I am delivered, praise the Lord! I am delivered by his word",
    "lyrics": "I am delivered, praise the Lord!\nI am delivered by his word;\nOnce I was bound by the chains of\nSatan,\nI am delivered praise the lord'\nChorus:\nGreat change in me, great\nChange in me,\nI am so happy and I  am so free;\nHe brought me out of bondage into\nHis marvelous life\nO, O, O, great change in me.\nPH. 106"
  },
  {
    "id": "english-100",
    "language": "english",
    "languageLabel": "English",
    "number": 100,
    "title": "When we walk with the lord In the light of his word",
    "lyrics": "1. When we walk with the lord\nIn the light of his word,\nWhat a glory He sheds on our way!\nWhile we do his good will\nHe abides with us still,\nAnd with all who will trust and\nobey\nTrust and obey! For there's no\nother way\nTo be happy in Jesus but to\ntrust and obey\n2. Not a shadow can rise,\nNot a cloud in the skies,\nBut His smile quickly drives it\naway\nNot a doubt nor a fear,\nNot a sigh nor a tear\nCan abide while we trust and obey.\n3. Not a burden we bear,\nNot a shadow we share,\nBut our toil he doth richly repay,\nNot a grief nor a loss,\nNot a frown nor a cross.\nBut is blest if we trust and obey.\n4. But we never can prove\nThe delights of His love,\nUntil all on the altar we lay,\nFor the favour He shows,\nAnd the joy he bestows\nAre for them who will trust\nAnd obey\n5. Then in fellowship sweet\nWe will sit at His feet;\nOr we'll walk by His side in the way;\nWhat He says we will do,\nWhere he sends we will go,\nNever fear, only trust and obey\nRH. 477, J.H. Sammis"
  },
  {
    "id": "english-101",
    "language": "english",
    "languageLabel": "English",
    "number": 101,
    "title": "Simply trusting everyday Trusting through stormy way",
    "lyrics": "1. Simply trusting everyday\nTrusting through stormy way;\nEven, when my faith is small\nTrusting Jesus, that is all.\nTrusting as the mountain fly\nTrusting as the days go by;\nTrusting him what'er befall,\nTrusting Jesus, that is all\n2. Brightly doth his spirit shine\nInto this  poor heart of mine;\nWhile he leads I cannot fall;\nTrusting Jesus, that is all.\n3. Singing if my way be clear;\nPraying if the path be drear;\nIf in danger for Him call;\nTrusting Jesus, that is all.\n4. Trusting Him while life shall last\nTrusting him till earth be past;\nTill within the jasper wall;\nTrusting Jesus that is all.\nRH 480, E. Page"
  },
  {
    "id": "english-102",
    "language": "english",
    "languageLabel": "English",
    "number": 102,
    "title": "1 . Master speak! Thy servant heareth",
    "lyrics": "1 . Master speak! Thy servant heareth\nWaiting for thy gracious word,\nLonging for thy voice that\ncheereth\nMaster, let it now be heard.\nI am listening, lord, for thee;\nWhat hast thou to say to me!\n2. Speak to me by name O master,\nLet me know it is to me,\nSpeak, that I may follow faster,\nWith a step more firm and free,\nWhere the shepherd leads flock\nIn the shadow of the rock.\n3. Master speak! Though least\nand lowest.\nLet me not unheard depart;\nMaster, speak for oh,\nThou knowest\nAll the yearning of my heart,\nKnowest all its truest need;\nSpeak! And make me blest indeed.\n4. Master, speak and make me ready,\nWhen thy voice is truly heard,\nWith obedience glad and steady,\nStill to follow every word,\nI am listening lord, for thee,\nMaster, speak, oh, speak to me!\nRH. 487, Frances R. Havergal"
  },
  {
    "id": "english-103",
    "language": "english",
    "languageLabel": "English",
    "number": 103,
    "title": "Jesus my king, my wonderful Saviour",
    "lyrics": "1. Jesus my king, my wonderful\nSaviour\nAll of my life is given to thee;\nI am rejoicing in thy salvation,\nThy precious blood now maketh\nMe free\nWonderful saviour, wonderful\nsaviour\nThou art so near, so precious\nto me;\nWonderful saviour, wonderful\nsaviour\nMy heart is filled with praises\nto thee\n2. Freedom from sin oh!\nWonderful Story!\nAll of its strains washed whiter\nthan snow,\nJesus has come to live in his temple\nAnd with his love my heart is aglow.\n3. Jesus my lord, I'll ever adore\nthee\nLay at thy feet my treasures of\nlove;\nLead me in ways to show forth\nthy glory,\nWays that will end in heaven\nabove.\n4. When in that bright and\nbeautiful city\nI shall behold thy glories untold,\nI shall be like thee, wonderful\nsaviour,\nAnd I will sing while ages unfold.\nR.H. 517\nJ. M. Haris"
  },
  {
    "id": "english-104",
    "language": "english",
    "languageLabel": "English",
    "number": 104,
    "title": "When peace, like a river attended my way",
    "lyrics": "1. When peace, like a river attended\nmy way\nWhen sorrows, like sea billows\nroll;\nWhatever my lot, Thou has\ntaught me to know,\n\"It is well, it is well with my\nsoul\nIt is well… with my soul…\nIt is well, it is well with my soul\n2 Though, Satan should buffet, if\nTrials should come\nLet this blest assurance control,\nThat Christ hath regarded my\nhelpless estate,\nAnd hath shed his own blood\nfor my soul.\n3. My sin-oh, the bliss of this\nglorious thought\nMy sin - not in part but the\nwhole\nIs nailed to his cross; and I bear\nit no more;\nPraise the lord, praise the lord,\nO my soul.\n4. For me, be it Christ, be it Christ\nhence to live!\nIf  Jordan above me shall roll,\nNo pang shall be mine, for in\ndeath as in life.\nThou wilt whisper thy peace to\nmy soul.\n5. But lord, 'tis for thee, for thy\ncoming we wait\nThe sky, not the grave, is our goal\nOh, trump of the angel! Oh,\nvoice of the lord'\nBlessed hope! Blessed rest of\nmy soul.\nR.H. 527, H.G . Spatted."
  },
  {
    "id": "english-105",
    "language": "english",
    "languageLabel": "English",
    "number": 105,
    "title": "Peace, perfect peace, in this dark world of sin?",
    "lyrics": "1. Peace, perfect peace, in this\ndark world of sin?\nThe blood of Jesus whispers\npeace within\n2. Peace, perfect peace, by\nthronging duties pressed?\nTo do the will of Jesus, this is\nrest\n3. Peace, perfect peace, with\nsorrows surging round?\nOn Jesus' bosom naught but\ncalm is found.\n4. Peace, perfect peace, with\nloved ones far away?\nIn Jesus' keeping we are safe\nand they.\n5. Peace, perfect peace, our future\nall unknown\nJesus we know, and He is on\nthe throne.\n6. Peace, perfect peace, death\nshadowing us and ours?\nJesus has vanquished death and\nall its powers\n7. It is enough; earth's struggles\nsoon shall cease,\nAnd Jesus calls us to Heaven's\nperfect peace.\nRH.529\nE.H. Bickersteth"
  },
  {
    "id": "english-106",
    "language": "english",
    "languageLabel": "English",
    "number": 106,
    "title": "Immortal; Invisible God only wise In light inaccessible hid from our",
    "lyrics": "1. Immortal; Invisible God only wise\nIn light inaccessible hid from our\neyes\nMost blessed, most glorious,\nThe Ancient of Days\nAlmighty, victorious, Thy great\nname we praise\n2 Unresting, unhasting, and silent\nas light\nNor wanting, nor wasting,\nThou rulest in might\nThy justice like mountains high\nsoaring above,\nThy clouds which are fountains\nof goodness and love\n3. To all life Thou givest - to both\ngreat and small\nIn all life Thou livest, the true\nlife of all;\nWe blossom and flourish as\nleaves on the tree,\nAnd wither and perish - but\nnought changeth thee.\n4. Great father of Glory, pure\nFather of light\nThine angels adore Thee, all\nveiling their sight;\nAll laud we would render, O\nhelp us to see:\nThis only the splendour of light\nhideth Thee\n5 Immortal, invisible, God only wise,\nIn light inaccessible hid from our\neyes\nMost blessed, most glorious;\nThe Ancient of Days\nAlmighty, victorious, Thy great\nname we praise\nRH 36, Water Chalmer Smith"
  },
  {
    "id": "english-107",
    "language": "english",
    "languageLabel": "English",
    "number": 107,
    "title": "1 O Lord of heav'n and earth and sea",
    "lyrics": "1 O Lord of heav'n and earth and\nsea\nTo Thee all praise and glory be:\nHow shall we show our love to Thee\nWho givest all?\n2 Thou didst not spare Thine only\nSon,\nBut gav'st Him for a world undone;\nAnd finely with the blessed One\nThou givest all?\n3. We lose what on ourselves we\nspend\nWe have a treasure without end\nWhatever Lord to Thee we lend.\nWho givest all;\n4 To thee from whom we all derive\nOur life our gifts our power to give!\nO may we ever with Thee live\nWho givest all?\n5. Thou giv'st the Spirit blessed dower\nSpirit of life, and love and power.\nAnd dost His sevenfold graces\nshower\nUpon us all.\n6. For souls redeemed. For sins\nforgiven\nFor means of grace and hopes\nof heaven\nFather all praise to Thee be given\nWho givest all?\nRH 33, C. Wondworth"
  },
  {
    "id": "english-108",
    "language": "english",
    "languageLabel": "English",
    "number": 108,
    "title": "O worship the King All glorious above",
    "lyrics": "1. O worship the King\nAll glorious above,\nO gratefully sing\nHis power and his love;\nOur shield and Defender.\nThe Ancient of Days\nPavilioned in splendour,\nAnd girded with praise\n2 O tell His might,\nO sing of His grace,\nWhose canopy space\nHis chariots of wrath\nThe deep thunder-clouds form,\nAnd dark is His path\nOn the wings of the storm.\n3. Thy bountiful care\nWhat tongue can recite?\nIt breaths in the air.\nIt shines in the light\nIt streams from the hills\nIt descends to the plain\nAnd sweetly distils\nIn the dew and the rain\n4 Frail children of dust.\nAnd feeble as frail;\nIn Thee do we trust.\nNor find Thee to fail:\nThe mercies how tender\nHow firm to the end\nOur Maker Defender.\nRedeemer and Friend\n5. O measureless might!\nIneffable Love!\nWhile angels delight\nTo hymn Thee above.\nThe Humbler creation\nThough feeble their lays.\nWith true adoration\nShall lisp to Thy praise\nRH 10, R. Grant"
  },
  {
    "id": "english-109",
    "language": "english",
    "languageLabel": "English",
    "number": 109,
    "title": "1 Oh, for a thousand tongues to sing",
    "lyrics": "1 Oh, for a thousand tongues to sing\nMy great Redeemers praise\nThe Glories of my God and King\nThe triumphs of His grace!\n2. My gracious Master and my\nGod,\nAssist me to proclaim,\nTo spread through all the earth\nabroad\nThe honour of Thy name\n3. Jesus! The name that charms\nour fears\nThat bids our sorrows cease;\n'Tis music in the sinner's ears,\n'Tis life and health and peace.\n4. He breaks the power of cancelled\nsin\nHe sets the pris'ner free;\nHis blood can make the foulest\nclean\nHis blood availed for me.\n5. Hear Him, ye deaf; His praise ye\ndumb,\nYour loosened tongues employ;\nYe blind, behold your Saviour\ncome;\nAnd leap, ye lame, for joy!\nRH 8 Charles Wesley."
  },
  {
    "id": "english-110",
    "language": "english",
    "languageLabel": "English",
    "number": 110,
    "title": "Praise, my soul, the King of heaven",
    "lyrics": "1. Praise, my soul, the King of\nheaven\nTo His feet thy tribute bring;\nRansomed, healed, restored,\nforgiven,\nWho like thee His praise should\nsing?\nPraise Him! Praise Him!\nPraise the everlasting King\n2. Praise Him for His grace and\nfavour\nTo our fathers in distress;\nPraise Him, still the same for\never,\nSlow to chide and swift to bless;\nPraise Him! Praise Him!\nGlorious in His faithfulness.\n3. Father-like He tends and spares us,\nWell our feeble frame he knows;\nIn His hands He gently bears us,\nRescues us from all our foes;\nPraise Him! Praise Him!\nWidely as His mercy flows.\n4. Angels, help us to adore Him!\nYe behold Him face to face;\nSun and moon, bow down\nbefore Him;\nDwellers all in time and space,\nPraise Him! Praise Him!\nPraise with us the God of grace.\nRH 5, H.F Lyte"
  },
  {
    "id": "english-111",
    "language": "english",
    "languageLabel": "English",
    "number": 111,
    "title": "All hail the power of Jesu's name!",
    "lyrics": "1. All hail the power of Jesu's name!\nLet angels prostrate fall;\nBring forth the royal diadem\nAnd crown Him Lord of all\n2. Crown Him, ye martyrs of our\nGod,\nWho from His altar call;\nExtol the stem of Jesse's rod,\nAnd crown him Lord of all.\n3. Ye chosen seed of Israel's race,\nAnd remnant weak and small,\nHail Him who saves you by His\ngrace\nAnd crown Him Lord of all.\n4. Ye Gentile sinners, ne'er forget\nThe wormwood and the gall;\nGo, spread your trophies at His\nfeet,\nAnd crown Him Lord of all.\n5. Let every kindred, every tribe\nOn this terrestrial ball,\nTo Him all majesty ascribe,\nAnd crown Him Lord of all\n6. O that with yonder sacred\nthrong\nWe at His feet may fall,\nJoin in the everlasting song,\nAnd crown Him Lord of all.\nRH 2, Edward Perronel"
  },
  {
    "id": "english-112",
    "language": "english",
    "languageLabel": "English",
    "number": 112,
    "title": "ABBA Father, let me be Yours, and yours alone",
    "lyrics": "ABBA Father, let me be\nYours, and yours alone,\nMay my will for ever be\nEvermore your own.\nNever let my heart grow cold,\nNever let me go,\nAbba Father, let me be\nYours and yours alone.\nDave Bilbrough"
  },
  {
    "id": "english-113",
    "language": "english",
    "languageLabel": "English",
    "number": 113,
    "title": "Abide with me, fast falls the even tide",
    "lyrics": "1. Abide with me, fast falls the\neven tide;\nThe darkness deepens; Lord,\nwith me abide,\nWhen other helpers fail and\ncomfort, flee\nHelp of the helpless, O abide\nwith me.\n2. Swift to its close ebbs our life's\nlittle day;\nEarth's joys grow dim, its glories\npass away\nChange and decay in all around\nI see\nO thou who changest not, abide\nwith me.\n3. I need thy presence every\npassing hour\nWhat but thy grace can foil the\ntempter's power?\nWho like thyself my guide and\nstay can be?\nThrough cloud and sunshine, O\nabide with me.\n4. I fear no foe, with thee at hand\nto bless;\nIlls have no weight, and tears no\nbitterness.\nWhere is death's sting?\nWhere, grave, thy victory?\nI triumph still, if thou abide with\nme.\n5. Keep thou thy cross before my\nclosing eyes;\nShine through the gloom, and\npoint me to the skies\nHeaven's morning breaks, and\nearth's vain shadows flee;\nIn life, in death, O Lord, abide\nwith me\nRH 797, H.F . Lyte (1793-1847)"
  },
  {
    "id": "english-114",
    "language": "english",
    "languageLabel": "English",
    "number": 114,
    "title": "O Jesus I have promised To serve thee to the end",
    "lyrics": "1. O Jesus I have promised\nTo serve thee to the end;\nBe thou for ever near me,\nMy master and my friend:\nI shall not fear the battle\nIf thou art by my side,\nNor wander from the pathway\nIf thou wilt be my guide\n2. O let me feel thee near me:\nthe world is ever near;\nI see the sights that dazzle\nThe tempting sounds I hear;\nMy foes are ever near me,\nAround me and within;\nBut Jesus, draw thou nearer\nAnd shield my soul from sin.\n3. O let me hear thee speaking\nIn accents clear and still,\nAbove the stones of passion,\nThe murmurs of self-will\nO speak to reassure me,\nTo hasten, or control;\nOh speak, and make me listen\nThou guardian of my soul.\n5. O let me see thy footmarks.\nAnd in them plant mine own;\nMy hope to follow duly\nIs in thy strength alone\nO guide me, call me, draw me,\nUphold me to the end;\nAnd then in heaven receive me,\nMy Saviour and my friend.\nBBC Songs of Praise 339\nJ.E. Bode (1816-74)"
  },
  {
    "id": "english-115",
    "language": "english",
    "languageLabel": "English",
    "number": 115,
    "title": "O when the saints go marching in O when the saint to marching in",
    "lyrics": "1. O when the saints go marching in\nO when the saint to marching in\nO Lord, I want to be in that\nnumber\nWhen the saint go marching in!\n2. O when they crown him Lord of all\nO when they crown him Lord of all\nO Lord, I want to be that in number\nWhen they crown him Lord of all.\n3. O when all knees bow at his name\nO when all knees bow at his name\nO Lord, I want to be in that number\nWhen all knees bow at his name\n4. O when they sing the Saviour's\npraise\nO when they sing the Saviour's\npraise\nO Lord, I want to be in that\nnumber\nO when they sing the Saviour's\npraise\n5. O when the saints go marching in\nO when the saints go marching in\nO Lord, I want to be that in number\nWhen the saints go marching in\nBBC Songs 203"
  },
  {
    "id": "english-116",
    "language": "english",
    "languageLabel": "English",
    "number": 116,
    "title": "On a hill fare away stood an old rugged cross",
    "lyrics": "1. On a hill fare away stood an old\nrugged cross\nThe emblem of suffering and shame\nAnd I love that old cross where\nthe dearest and best\nFor a world of lost sinners as slain\nSo I'll cherish the old rugged cross\nTill my trophies at last I lay down\nI will cling to the old rugged cross\nAnd exchange it some day for a\ncrown\n2. O, the old rugged cross, so\ndespised by the world\nHas a wondrous attraction for me;\nFor the dear Lamb of God left\nhis glory above\nTo bear it to dark Calvary.\n3. In the old rugged cross, stained\nWith blood so divine\nA wondrous beauty I see;\nFor 'twas on that old cross\nJesus suffered and died\nTo pardon and sanctify me\n4. To the old rugged cross I will\never be true\nIts shame and reproach gladly\nbear,\nThen he'll call me someday to\nmy home far away,\nWhen his glory for ever I'll share\nBBC Songs 88\nGeorge Bernard (1873-1958)"
  },
  {
    "id": "english-117",
    "language": "english",
    "languageLabel": "English",
    "number": 117,
    "title": "Praise God, from whom all blessings",
    "lyrics": "Praise God, from whom all blessings\nflow,\nPraise him all creatures here below,\nPraise him above, ye heavenly host,\nPraise Father, son and Holy Ghost\nThomas Ken (1637-1711)\nBBC songs 172"
  },
  {
    "id": "english-118",
    "language": "english",
    "languageLabel": "English",
    "number": 118,
    "title": "Praise to the Lord, the Almighty The King of creation!",
    "lyrics": "1. Praise to the Lord, the Almighty\nThe King of creation!\nO my soul, praise him, for he is thy\nHealth and salvation;\nCome ye who hear,\nBrothers and sister, draw near,\nPraise him in glad adoration!\n2. Praise to the Lord, who o'er all\nthings\nSo wondrously reigneth\nShelters thee under his wings, yea\nSo gently sustaineth,\nHast thou not seen\nAll that is needful hath been\nGranted in what he ordaineth?\n3. Praise to the Lord, who doth\nprosper\nThy work and defend thee!\nSurely his goodness and mercy\nhere daily attend thee;\nPonder anew\nAll the Almighty can do\nHe who with love doth befriend\nthee\n4. Praise to the Lord, who when\nTempests their warfare are\nwaging,\nWho, when the element madly\naround thee are raging\nBiddeth them cease,\nTurneth their fury to peace,\nWhirlwinds and waters\nassuaging.\n5. Praise to the Lord, who when\nDarkness of sin is abounding,\nWho, when the godless do\ntriumph,\nAll virtue confounding,\nSheddeth his light,\nChaseth the horrors of night,\nSaints with his mercy\nSurrounding.\n6. Praise to the Lord! O let all that\nis in me adore him\nAll that hath life and breath\nCome now with praises before\nhim!\nLet the Amen sound from his\npeople again\nGladly for aye we adore him!\nJoachim Neander (1650-80)\nTr. Catherine Winkworth\n(1827-78) and others\nBBC Songs 19"
  },
  {
    "id": "english-119",
    "language": "english",
    "languageLabel": "English",
    "number": 119,
    "title": "Reign in me, Sovereign Lord, reign",
    "lyrics": "Reign in me, Sovereign Lord, reign\nin me,\nReign in me, sovereign Lord, reign\nin me\nCaptivate my heart,\nLet your Kingdom come\nEstablish there your throne\nLet your will be done!\nReign in m, Sovereign Lord, reign in\nme\nReign in me sovereign Lord,\nReign in m\nChris Bowater BBC Songs 158"
  },
  {
    "id": "english-120",
    "language": "english",
    "languageLabel": "English",
    "number": 120,
    "title": "1 O, come, all ye faithful Joyful and triumphant",
    "lyrics": "1 O, come, all ye faithful\nJoyful and triumphant\nCome ye, O come ye to\nBethlehem;\nCome and behold him\nBorn the King of angels:\nChorus\nO come, let us adore him\nO come, let us adore him\nO come, let us adore him\nChrist the Lord!\n2. True God of true God\nLight of light eternal\nLo! He abhors not the\nVirgin's womb\nSon of the Father,\nBegotten, not created.\n3. Sing choirs of angels\nSing in exultation\nSing, all ye citizens of heaven\nabove,\nGlory to God\nIn the highest\n4. Yea, Lord we greet Thee\nBorn this happy morning;\nJesus, to Thee be glory given\nWord of the Father,\nNow in flesh appearing\nMHB 118\nAnonymous, 17th or 18 cent.\nTr. Frederick Oakeley (1802-80)"
  },
  {
    "id": "english-121",
    "language": "english",
    "languageLabel": "English",
    "number": 121,
    "title": "There is a Redeemer, Jesus, God's own Son",
    "lyrics": "1. There is a Redeemer,\nJesus, God's own Son,\nPrecious Lamb of God, Messiah,\nHoly One\nThank you, O my Father\nFor giving us your Son,\nAnd leaving your Spirit till\nThe work on earth is done.\n2. Jesus, my Redeemer,\nName above all names,\nPrecious Lamb of God, Messiah\nO for sinners slain.\n3. When I stand in glory\nI will see his face\nAnd there I'll serve my King for\never\nIn that holy place\nBBC Songs 253\nMelody Green w 1,2\nKeith Green v3"
  },
  {
    "id": "english-122",
    "language": "english",
    "languageLabel": "English",
    "number": 122,
    "title": "Thy Kingdom come, O God Thy rule, O Christ, begin",
    "lyrics": "1. Thy Kingdom come, O God\nThy rule, O Christ, begin\nBreak with thine iron rod\nThe tyrannies of sin\n2. Where is thy reign of peace?\nAnd purity and love?\nWhen shall all hatred cease?\nAs in the realms above?\n3. When comes the promised time?\nThat war shall be no more\nAnd lust oppression, crime\nShall flee thy face before?\n4. We pray thee, Lord, arise,\nAnd come in thy great might;\nRevive our longing eyes,\nWhich languish for thy sight.\n5. O'er lands both near and far\nThick darkness broodeth yet;\nArise, O Morning star\nArise, and never set!\nBBC Songs 24\nLewis Hensley (1824-1905)"
  },
  {
    "id": "english-123",
    "language": "english",
    "languageLabel": "English",
    "number": 123,
    "title": "All heaven declares The glory of the risen Lord",
    "lyrics": "1. All heaven declares\nThe glory of the risen Lord;\nWho can compare\nWith the beauty of the Lord?\nFor ever he will be\nThe lamb upon the throne\nI gladly bow the knee,\nAnd worship him alone\n2. I will proclaim\nThe glory of the risen Lord,\nWho once was slain\nTo reconcile man to God\nFor ever you will be\nThe lamb upon the throne\nI gladly bow the knee\nAnd worship you alone.\nBBC 134\nTracia Richards"
  },
  {
    "id": "english-124",
    "language": "english",
    "languageLabel": "English",
    "number": 124,
    "title": "1 Be still, my soul; the lord is on",
    "lyrics": "1 Be still, my soul; the lord is on\nthy side\nBear patiently the cross of grief\nor pain;\nLeave to thy God to order and\nprovide;\nIn every change he faithful will\nremain;\nBe still, my soul: thy best, thy\nheavenly friend\nThrough thorny way leads to a\njoyful end\n2. Be still, my soul, thy God doth\nundertake\nTo guide the future as he has\nthe past\nThy hope, thy confidence let\nnothing shake\nAll now mysterious shall be\nbright at last\nBe still, my soul; the waves and\nwinds still know\nHis voice who ruled them while\nhe dwelt below\n3. Be still, my soul; when dearest\nfriend depart\nAnd all is darkened in the vale\nof tears\nThen shalt thou better know his\nlove, his heart\nWho comes to soothe thy sorrow\nand thy fears\nBe still, my soul, thy Jesus can\nrepay\nFrom his own fullness, all he\ntakes away.\n4. Be still, my soul; the hour is\nhastening on\nWhen we shall be forever with\nthe Lord.\nWhen disappointment, grief and\nfear are gone\nSorrow forgot, love's purest joys\nrestored\nBe still, my soul, when change\nand tears are past\nAll safe and blessed we shall\nmeet at last\nBBC Songs 286\nKatharina Von Schlegel (1697)\nTr. Jane Laurie Borthwick\n(1813-97)"
  },
  {
    "id": "english-125",
    "language": "english",
    "languageLabel": "English",
    "number": 125,
    "title": "Bind us together, Lord Bind us together, with cords",
    "lyrics": "1. Bind us together, Lord\nBind us together, with cords\nThat cannot be broken,\nBind us together, Lord\nBind us together, Lord\nO bind us together with love\nThere is only one God\nThere is only one King\nThere is only one body\nThat is why we sing\n2. Made for the Glory of God\nPurchased by his precious Son\nBorn with the right to be clean\nFor Jesus the victory has won\n3. You are the family of God\nYou are the promise divine\nYou are God's chosen desire.\nYou are the glorious new wine\nBBC Songs 356, Bob Gillman"
  },
  {
    "id": "english-126",
    "language": "english",
    "languageLabel": "English",
    "number": 126,
    "title": "Crown him with many crowns The Lamb upon his throne",
    "lyrics": "1. Crown him with many crowns\nThe Lamb upon his throne\nHark! How the heavenly\nAnthem drowns\nAll music but its own\nAwake; my soul, and sing\nOf him who died for thee..\nAnd hail him as thy matchless\nKing\nThrough all eternity.\n2. Crown him the Son of God\nBefore the words began;\nAnd ye who tread where he had\ntrod,\nCrown him the son of Man\nWho every grief hath known\nThat wrings the human breast\nAnd takes and bears them for\nhis own,\nThat all in him may rest\n3. Crown him the Lord of love\nBehold his hands and side'\nThose wounds yet visible above\nIn beauty glorified\nNo angel in the sky\nCan fully bear that sight\nBut downward bends his\nburning eye\nAt mysteries so bright.\n4. Crown him the Lord of peace\nWhose power a sceptre sways\nFrom pole to pole, that war may\ncease\nAnd all be prayer and praise\nHis reign shall know no end\nAnd round his pierced feet\nFair flowers of paradise extend\nTheir fragrance ever sweet.\n5. Crown him the Lord of years\nThe Potentate of time,\nCreator of the rolling spheres,\nIneffably sublime;\nAll hail, Redeemer hail!\nFor thou has died for me:\nThy praise shall never, never fail\nThroughout eternity.\nBBC Songs 121\nMatthew Bridges, (1800-94)\nv. 1,3,5,\nGodfrey Thring (1823-1903) v2."
  },
  {
    "id": "english-127",
    "language": "english",
    "languageLabel": "English",
    "number": 127,
    "title": "Father, we adore you, Lay our lives before you",
    "lyrics": "1. Father, we adore you,\nLay our lives before you;\nHow we love you!\n2. Jesus, we adore you\nLay our live before you;\nHow we love you\n3. Spirit, we adore you\nLay our live before you;\nHow we love you!\nTerry Coelho (b.1952)"
  },
  {
    "id": "english-128",
    "language": "english",
    "languageLabel": "English",
    "number": 128,
    "title": "Father, we love you, we worship and adore you",
    "lyrics": "1. Father, we love you, we worship\nand adore you;\nGlorify your name in all the\nearth,\nGlorify your name! Glorify\nyour name!\nGlorify your name in all the\nearth,\n2. Jesus, we love you, we worship\nand adore you;\n3. Spirit, we love you, we worship\nand adore you.\nBBC Songs 219\nDonna Adkins (b. 1940)"
  },
  {
    "id": "english-129",
    "language": "english",
    "languageLabel": "English",
    "number": 129,
    "title": "For I'm building a people of power",
    "lyrics": "For I'm building a people of power\nAnd I'm making a people of praise\nThat will move through this land by\nmy spirit\nAnd will glorify my precious name\nBuild your Church Lord,\nMake us Strong, Lord,\nJoin our hearts, through your Son.\nMake us one Lord, in your body\nIn the Kingdom of your Son\nBBC Songs 221\nDave Richards (b. 1947"
  },
  {
    "id": "english-130",
    "language": "english",
    "languageLabel": "English",
    "number": 130,
    "title": "Give me joy in my heart, Keep me praising",
    "lyrics": "1. Give me joy in my heart, Keep\nme praising\nGive my joy in my heart, I pray;\nGive my joy in my heart keep\nthe praising\nKeep me praising till the break\nof day\nSing hosanna! Sing hosanna!\nSing hosanna to the King of  Kings!\nSing hosanna! Sing hosanna!\nSing hosanna to the King!\n2. Give me peace in my heart,\nKeep me loving\nGive me peace in my Heart I pray\nGive me peace in my heart,\nkeep me loving\nKeep me loving till the break of day.\n3. Give me love in my heart, keep\nme serving\nGive me love in my heart, I pray\nGive me love in my heart keep\nme serving\nKeep me serving till the break\nof day\nBBC Songs 223"
  },
  {
    "id": "english-131",
    "language": "english",
    "languageLabel": "English",
    "number": 131,
    "title": "Go, tell it on the mountain Over the hills and everywhere",
    "lyrics": "Go, tell it on the mountain\nOver the hills and everywhere\nGo, tell it on the mountain\nThat Jesus is his name\n1. He possessed no riches\nNo home to lay his head;\nHe saw the needs of others\nAnd cared for them instead\n2. He reached out and touched\nthem\nThe blind, the deaf, the lame;\nHe spoke and listened gladly\nTo anyone who came\n3. Some turned away in anger,\nWith hatred in the eye;\nThey tried him and condemned\nhim\nThen led him out to die\n4. 'Father, now forgive them'\nUpon the cross he said;\nIn three more days he was alive\nAnd risen from the dead\n5. He still comes to people\nHis life moves through the\nlands;\nHe uses us for speaking\nHe touches with our hands\nGeoffrey Marshall Taylc\nBBC Songs 139"
  },
  {
    "id": "english-132",
    "language": "english",
    "languageLabel": "English",
    "number": 132,
    "title": "He lives, he lives Chris Jesus lives today!",
    "lyrics": "He lives, he lives\nChris Jesus lives today!\nHe walks with me and talks with me\nAlong life's, narrow way\nHe lives, he lives,\nSalvation to impart!\nYou ask me how I know he lives?\nHe lives within my heart\nBBC Songs 144\nA.H. Ackley (1887-1960)"
  },
  {
    "id": "english-133",
    "language": "english",
    "languageLabel": "English",
    "number": 133,
    "title": "Holy, holy, holy! Lord God Almighty!",
    "lyrics": "1. Holy, holy, holy!\nLord God Almighty!\nEarly in the morning our song\nShall rise to thee;\nHoly, holy, holy!\nMerciful and mighty\nGod in three Persons blessed\nTrinity!\n2. Holy, holy, holy! All the saints\nadore thee,\nCasting down their golden\ncrowns around the glassy sea;\nCherubim and Seraphim falling\ndown before thee,\nWhich wert, and art and\nevermore shalt be\n3. Holy, holy, holy! Though the\ndarkness hide thee\nThough the eye of sinful man\nthy glory may not see\nOnly thou art holy, there is none\nbeside thee\nPerfect in power in love and purity\n4. Holy, holy, holy!\nLord God Almighty\nAll thy works shall praise thy\nname,\nIn earth and sky and sea\nHoly, holy, holy!\nMerciful and mighty!\nGod in three Persons blessed\nTrinity!\nBBC Songs 170\nReginald Heber (1738-1826)"
  },
  {
    "id": "english-134",
    "language": "english",
    "languageLabel": "English",
    "number": 134,
    "title": "O Lord my God, when I in awesome wonder",
    "lyrics": "1. O Lord my God, when I in\nawesome wonder\nConsider all the works thy hand\nhath made\nI see the stars, I hear the mighty\nthunder\nThy power throughout the\nuniverse displayed\nThen sing my soul, my Saviour\nGod, to thee\nHow great thou art, how great\nthou art!\nThen sing my soul, my Saviour\nGod to thee\nHow great thou art, how great\nthou art!\n2. When through the woods and\nforest glades I wander\nAnd hear the birds sing sweetly\nin the trees\nWhen I look down from lofty\nmountain grandeur\nAnd hear the brook, and feel the\ngentle breeze\n3. And when I think that God his\nSon not spring\nSent him to die - I scarce can\ntake it in,\nThat on the cross, my burden\ngladly bearing\nHe bled and died to take away\nmy sin;\n4. When Christ shall come with\nshout of acclamation\nAnd take me home- what joy\nshall fill my heart\nThen shall I bow in humble\nadoration,\nAnd there proclaim my God,\nhow great thou art!\nBBC Songs 13 Russian hymn\nTr. Stuart K. Hine (1899-1989)"
  },
  {
    "id": "english-135",
    "language": "english",
    "languageLabel": "English",
    "number": 135,
    "title": "I will enter his gates with thanksgiving in my heart",
    "lyrics": "1. I will enter his gates with\nthanksgiving in my heart,\nI will enter his courts with praise,\nI will say this is the day that the\nLord has made\nI will rejoice for he has made me glad\nHe has made me glad, He has\nmade me glad;\nI will rejoice for he has made me glad\nIt has made me glad\nI will rejoice for he has made me glad\nBBC Songs 208\nLeona Von Brethor st"
  },
  {
    "id": "english-136",
    "language": "english",
    "languageLabel": "English",
    "number": 136,
    "title": "Jesus is Lord! Creation's voice proclaim it",
    "lyrics": "1. Jesus is Lord! Creation's voice\nproclaim it\nFor by his power\nEach tree and flower\nWas planned and made\nJesus is Lord! The universe\ndeclares it\nSun, moon and stars in heaven\ncry;\nJesus is Lord!\nJesus is Lord, Jesus is Lord!\nPraise him with Alleluias\nFor Jesus is Lord\n2. Jesus is Lord! Yet from his\nthrone eternal\nIn flesh he came\nTo die in pain\nOn Calvary's tree\nJesus is Lord! From him all life\nproceeding\nHe gave his life a ransom thus\nsetting us free.\n3. Jesus is Lord! O'er sin the\nmighty conqueror\nFrom death he rose\nAnd all his foes shall own his name\nJesus is Lord! God sent his Holy\nSpirit\nTo show by works of power that\nJesus is Lord!\nBBC Song 153\nDavid Mansel (b. 1936)"
  },
  {
    "id": "english-137",
    "language": "english",
    "languageLabel": "English",
    "number": 137,
    "title": "Joy to the world, the Lord has come!",
    "lyrics": "1. Joy to the world, the Lord has\ncome!\nLet earth receive her King;\nLet every heart prepare him room\nAnd heaven and nature sing\n2. Joy to the earth, the Saviour\nreigns!\nYour sweetest songs employ;\nWhile fields and streams sad\nhills and plains\nRepeat the sounding joy.\n3. He rules the world with truth\nand grace\nAnd makes the nations prove\nThe glories of his\nrighteousness,\nThe wonders of his love\nBlessings 154\nIsaac Watts (1674-1785) altd\nBased on Psalm 98"
  },
  {
    "id": "english-138",
    "language": "english",
    "languageLabel": "English",
    "number": 138,
    "title": "Just as I am, without one plea But that thy blood was shed for",
    "lyrics": "1. Just as I am, without one plea\nBut that thy blood was shed for\nme,\nAnd that thou bidst me come to\nthee\nO lamb of God, I come\n2. Just as I am, though tossed\nabout\nWith many a conflict, many a\ndoubt\nFighting and fears within\nwithout\nO lamb of God I come.\n3. Just as I am, wretched, blind;\nSight riches, healing of the mind,\nYea all I need, in thee to find,\nO lamb of God I come\n4. Just as I am, thou wilt receive,\nWilt welcome, pardon, cleanse\nrelieve.\nBecause thy promise I believe,\nO lamb of God, I come\n5. Just as I am, (thy love unknown\nHas broken every barrier down),\nNow to be thine, yea thine\nalone,\nO Lamb of God, I come\n6. Just as I am, Of that free love\nThe breadth, length, depth and\nheight to prove,\nHere for a season, then above\nO Lamb of God I come.\nBBC Songs 274\nCharlotte Elliot (1789-1871)"
  },
  {
    "id": "english-139",
    "language": "english",
    "languageLabel": "English",
    "number": 139,
    "title": "King of glory, King of peace I will love thee",
    "lyrics": "1. King of glory, King of peace\nI will love thee;\nAnd that love may never cease,\nI will move thee,\nThou hast granted my request,\nThou hast heard me;\nThou didst not my working\nbreast\nThou hast spared me.\n2. Wherefore with my utmost art\nI will sing thee\nAnd the cream of all my heart\nI will bring thee\nThough my sins against me\ncried,\nThou didst clear me;\nAnd alone, when they replied\nThou didst hear me\n3. Seven whole days, not one in\nseven\nI will praise thee;\nIn my heart, though not in\nheaven,\nI can raise thee\nSmall it is, in this poor sort\nTo enroll thee;\nE'en eternity's too short\nTo extol thee.\nBBC Songs 297\nGeorge Herbert (1595-1635)"
  },
  {
    "id": "english-140",
    "language": "english",
    "languageLabel": "English",
    "number": 140,
    "title": "Let there be love shared among us Let there be love in our eyes",
    "lyrics": "Let there be love shared among us\nLet there be love in our eyes,\nMay now your love weep this\nnation,\nCause us, O Lord to arise\nGive us a fresh understanding\nOf brotherly love that is real,\nLet there be love shared among us\nLet there be love.\nBBC Songs 364\nDave Billbrough"
  },
  {
    "id": "english-141",
    "language": "english",
    "languageLabel": "English",
    "number": 141,
    "title": "Rejoice in the Lord always And again I say, rejoice",
    "lyrics": "Rejoice in the Lord always\nAnd again I say, rejoice,\nRejoice in the Lord always\nAnd again I say rejoice\nRejoice, rejoice\nAnd again I say rejoice,\nRejoice in the Lord always\nAnd again I say rejoice\nPH 37"
  },
  {
    "id": "english-142",
    "language": "english",
    "languageLabel": "English",
    "number": 142,
    "title": "Day by day dear Lord Of these three things I pray",
    "lyrics": "Day by day dear Lord\nOf these three things I pray\nTo see thee more dearly\nLove thee more clearly\nFollow thee more nearly\nDay by day."
  },
  {
    "id": "english-143",
    "language": "english",
    "languageLabel": "English",
    "number": 143,
    "title": "His Name is Wonderful His Name is Wonderful",
    "lyrics": "His Name is Wonderful\nHis Name is Wonderful\nHis Name is Wonderful\nJesus my Lord\nHe is the mighty King\nMaster of every thing\nHis Name is Wonderful\nJesus my Lord\nHe's the Great Shepherd\nThe Rock of all Ages\nAlmighty God is He\nBow down before Him,\nLove and adore Him\nHis name is wonderful\nJesus my Lord.\nAudrey Mieir"
  },
  {
    "id": "english-144",
    "language": "english",
    "languageLabel": "English",
    "number": 144,
    "title": "I love You Lord And I lift my voice",
    "lyrics": "I love You Lord\nAnd I lift my voice\nTo worship You,\nO my Soul rejoice\nTake joy, my King\nIn what you hear,\nSweet sound in Your ear"
  },
  {
    "id": "english-145",
    "language": "english",
    "languageLabel": "English",
    "number": 145,
    "title": "When I survey the wondrous Cross",
    "lyrics": "1. When I survey the wondrous\nCross\nOn which the Prince of Glory died,\nMy richest gain I count but loss,\nAnd pour contempt on all my pride\n2. Forbid it, Lord, that I should\nboast\nSave in the death of Christ my God;\nAll the vain things that charm\nme most,\nI sacrifice them to His blood\n3. See, from His head, His hands\nHis feet,\nSorrow and love flow mingled\ndown;\nDid e'er such love and sorrow\nmeet,\nOr thorns compose so rich a\ncrown\n3. Were the whole realm of nature\nmine,\nThat were on offering far too small;\nLove so amazing, so divine\nDemands my soul, my life my all.\nRH. 161, Isaac Watts"
  },
  {
    "id": "english-146",
    "language": "english",
    "languageLabel": "English",
    "number": 146,
    "title": "Jehovah is your Name (4x) Mighty Warrior, great in battle",
    "lyrics": "Jehovah is your Name (4x)\nMighty Warrior, great in battle\nJehovah is your Name\nJehovah is your Name"
  },
  {
    "id": "english-147",
    "language": "english",
    "languageLabel": "English",
    "number": 147,
    "title": "All things praise Thee, Lord most high",
    "lyrics": "1. All things praise Thee, Lord\nmost high\nHeaven and earth and sea and\nsky,\nAll were for Thy glory made\nThat Thy greatness thus displayed\nShould all worship bring to Thee;\nAll things praise thee: Lord may we\n2. All things praise Thee: night to\nnight\nSings in silent hymns of light;\nAll things praise thee: day to\nday\nChants Thy power, in burning\nray;\nTime and space are praising\nThee,\nAll things praise Thee Lord may we.\n3. All things praise thee; round her\nzones\nEarth, wither ten thousand tones\nRolls a ceaseless choral strain;\nRoaring wind and deep-voiced\nmain,\nRustling leaf and humming bee,\nAll things praise thee; Lord, may\nwe.\n4. All things praise Thee; high and\nlow,\nRain and dew and seven-hand\nbow,\nCrimson sunset, fleecy cloud,\nRippling stream and tempest\nloud;\nSummer, winter, all to Thee\nGlory render, Lord, may we.\n5. All things praise Thee; gracious\nLord,\nGreat Creator, powerful Word,\nOmnipresent Spirit, now\nAt Thy feet we humbly bow\nLift our heart in praise to thee;\nAll things praise Thee; Lord\nmay we. Amen\nMHB 29\nGeorge William Conder, 1821-74"
  },
  {
    "id": "english-148",
    "language": "english",
    "languageLabel": "English",
    "number": 148,
    "title": "Amen, Amen, Blessing and Glory Wisdom, thanksgiving and honour",
    "lyrics": "Amen, Amen, Blessing and Glory\nWisdom, thanksgiving and honour\nPower and might be unto our God\nFor ever and ever, Amen!\nRH 260."
  },
  {
    "id": "english-149",
    "language": "english",
    "languageLabel": "English",
    "number": 149,
    "title": "I heard a sound from Heaven And the anthem loud did swell",
    "lyrics": "I heard a sound from Heaven\nAnd the anthem loud did swell\nI saw the saints in glistering robes\nA number no man could tell;\nI saw the King of glory\nAnd the angels around the Throne\nSinging glory, Halleluiah!\nFor the glory of the Lamb is come!\nChorus\nSinging glory, Halleluia!\nSinging glory around the Throne!\nWaving palms with loud Hosannas\nFor the marriage of the Lamb is\ncome"
  },
  {
    "id": "english-150",
    "language": "english",
    "languageLabel": "English",
    "number": 150,
    "title": "My soul, rejoice and praise the Lord",
    "lyrics": "My soul, rejoice and praise the Lord\nRejoice and praise the Lord,\nMy soul, rejoice and praise the Lord\nRejoice and praise the Lord\nRejoice and praise the Lord\nRejoice and praise the Lord\nMy soul, rejoice and praise the Lord,\nRejoice and praise the Lord\nPH 255"
  },
  {
    "id": "english-151",
    "language": "english",
    "languageLabel": "English",
    "number": 151,
    "title": "Victory! Victory! Precious blood -bought victory",
    "lyrics": "Victory! Victory!\nPrecious blood -bought victory\nVictory! Victory! Victory all the time\nAs Jehovah liveth,\nStrength divine He giveth\nUnto those who trust Him\nVict'ry all the time\nPH 231, Mrs. C.H. Morris"
  },
  {
    "id": "english-152",
    "language": "english",
    "languageLabel": "English",
    "number": 152,
    "title": "Away far over Jordan We'll meet in that land",
    "lyrics": "1. Away far over Jordan\nWe'll meet in that land\nO won't it be grand!\nAway far over Jordan\nWe'll meet in that beautiful land\nSo grand\n2. If you get there before I do,\nPlease tell my friends that I'm\ncoming too,\nAway far over Jordan\nWe'll meet in that beautiful land\nso grand!\nRH 236"
  },
  {
    "id": "english-153",
    "language": "english",
    "languageLabel": "English",
    "number": 153,
    "title": "Softly and tenderly Jesus is calling",
    "lyrics": "1. Softly and tenderly Jesus is calling\nCalling for you and for me\nSee on the portal He's waiting\nand watching\nWatching for you and for me.\nChorus\nCome home, come home,\nYe who are weary come home;\nEarnestly, tenderly Jesus is\ncalling\nCalling, \"O sinner, come home!\"\n2. Why should we tarry when\nJesus is pleading\nPleading for you and for me?\nWhy should we linger and heed not\nHis mercies\nMercies for you and for me?\n3. Time is now fleeting, the\nmoment are passing\nPassing from you and from me,\nShadows are gathering, death-\nbeds\nAre coming\nComing for you and for me?\n4. Oh, for the wonderful love He\nhas promised\nPromised for you and for me\nThough we have sinned He has\nmercy and pardon\nPardon for you and for me\nPH 282 Will Thompson"
  },
  {
    "id": "english-154",
    "language": "english",
    "languageLabel": "English",
    "number": 154,
    "title": "Where will you spend eternity? This question comes to you and",
    "lyrics": "1. Where will you spend eternity?\nThis question comes to you and\nme\nTell me, what shall your answer\nbe?\nWhere will you spend eternity?\nChorus\nEternity! Eternity!\nWhere will you spend eternity?\n2. Many are choosing Christ today\nTurning from all their sins away\nHeav'n shall their happy portion\nbe,\nWhere will you spend eternity\n3. Leaving the straight and narrow way\nGoing the downward road today,\nSad will  their final ending be\nLost thro'a long eternity\n4. Repent, believe this very hour,\nTrust in the Saviour's grace and\npower\nThen will your joyous answer be,\nSaved thro'a long eternity\nChorus\nEternity! Eternity!\nWhere will you spend eternity?"
  },
  {
    "id": "english-155",
    "language": "english",
    "languageLabel": "English",
    "number": 155,
    "title": "Is there a heart that is waiting Longing for pardon today?",
    "lyrics": "1. Is there a heart that is waiting\nLonging for pardon today?\nHear the glad message\nproclaiming\nJesus is passing this way\nChorus\nJesus is passing this way\nThis way, this way\nJesus is passing this way\nHe is passing this way today\n2. Is there a heart that has\nwandered?\nCome with thy burden today;\nMercy is tenderly passing\nJesus is passing this way\n3. Is there a heart that is broken\nWeary and sighing for rest?\nCome to the arms of thy Saviour,\nPillow thy head on his Breast\n4. Come to thy only Redeemer\nCome to His infinite love,\nCome to the gate that is pleading\nHomeward to mansion above\nPH 286, Annie L. James"
  },
  {
    "id": "english-156",
    "language": "english",
    "languageLabel": "English",
    "number": 156,
    "title": "O magnify the Lord For He is worthy to be praised",
    "lyrics": "O magnify the Lord\nFor He is worthy to be praised,\nO magnify the Lord\nFor He is worthy to be praised\nHosanna! Blessed be the rock\nAnd may the God of my salvation\nbe exalted\nHosanna! Blessed be the rock\nAnd may the God of my salvation\nbe exalted\nPH 302"
  },
  {
    "id": "english-157",
    "language": "english",
    "languageLabel": "English",
    "number": 157,
    "title": "Sons of God, March forward In the power of the latter rain",
    "lyrics": "Sons of God, March forward\nIn the power of the latter rain\nSons of God, march forward,\nFor Jesus is ever the same,\nSons of God, march forward\nWe are more than conqu'rors in His\nName\nSons of God, march forward,\nIn the power of the latter Rain\nRH 94"
  },
  {
    "id": "english-158",
    "language": "english",
    "languageLabel": "English",
    "number": 158,
    "title": "There never was a day like this day",
    "lyrics": "There never was a day like this day\nto me,\nThere never was a day like this day\nI see\nThere never was a light that shineth\nso bright\nAs this day, this glorious day\nPH 134"
  },
  {
    "id": "english-159",
    "language": "english",
    "languageLabel": "English",
    "number": 159,
    "title": "It may not be on the mountain's height",
    "lyrics": "1. It may not be on the mountain's\nheight\nOr over the stormy sea;\nIt may not be at the battle front\nMy Lord will have need of me;\nBut if by a still small voice He\ncalls\nTo paths I do not know\nI'll answer, dear Lord, with my\nhand in Thine\nI'll go where you want me to go\nChorus\nI'll go where you want me to\ngo dear Lord\nO'er mountain, or plain or sea;\nI'll say what you want me to\nsay, dear Lord\nI'll be what you want me to be\n2. Perhaps today there are loving\nwords\nWhich Jesus would have me to\nspeak;\nThere may be now, in the paths\nof sin,\nSome wand'er whom I should seek,\nO Saviour, if thou wilt be my\nGuide\nTho' dark and rugged the way,\nMy voice shall echo the\nmessage sweet\nI'll say what you want me to say\n3. There's surely somewhere a\nlowly place\nIn earth's harvest-fields so wide.\nWhere I may labour thro 'life's\nshort day\nFor Jesus, the Crucified.\nSo, trusting my all unto Thy care,\nI know Thou lovest me!\nI'll do Thy will with a heart\nsincere,\nI'll be what you want me to be.\nMelodies of Praise 106\nPH 145, Mary Brown"
  },
  {
    "id": "english-160",
    "language": "english",
    "languageLabel": "English",
    "number": 160,
    "title": "There’s a land that is fairer than",
    "lyrics": "There’s a land that is fairer than\nday\nAnd by faith we can see it afar;\nFor the Father waits over the way,\nTo prepare us a dwelling place\nthere\nChorus\nIn the sweet by and by\nWe shall meet on that\nbeautiful shore\nIn the sweet by and by\nWe shall meet on that\nbeautiful shore\n2. We shall sing on that beautiful\nshore\nThe melodious songs of the\nblest,\nAnd our spirits shall sorrow no\nmore,\nNot a sign for the blessing of rest\n3. To our bountiful Father above\nWe will offer our tribute of praise,\nFor the glorious gift of His love,\nAnd the blessing that hallow\nour days\nPH 273, S. Bennet"
  },
  {
    "id": "english-161",
    "language": "english",
    "languageLabel": "English",
    "number": 161,
    "title": "There’s a fine, fine, fine Morning coming soon coming",
    "lyrics": "There’s a fine, fine, fine\nMorning coming soon coming\nsoon, coming soon;\nThe sun will shine, shine, shine\nshine,\nBanishing the gloom very soon,\nvery soon,\nWe shall gather all together over\non the other shore\nAll our trials and our troubles\nwill be gone for ever more;\nThere is a fine, fine, fine, fine\nMorning coming soon, coming\nsoon, yes soon\nPH 190"
  },
  {
    "id": "english-162",
    "language": "english",
    "languageLabel": "English",
    "number": 162,
    "title": "You’ve got to move, you’ve got to move",
    "lyrics": "1. You’ve got to move, you’ve got\nto move\nYou’ve got to move, you’ve got\nto move\nWhen the Lord gets ready,\nYou’ve got to move, move,\nmove move, move\n2. You may be high you may below,\nThe way to heaven; you may\nnot know,\nBut when the Lord gets ready,\nYou’ve got to move, move,\nmove, move, move\n3. You may be rich, you may be\npoor,\nThe way to heaven; you may\nnot know,\nBut when the Lord gets ready\nYou’ve got to move,move,\nmove, move, move,\nPH 174"
  },
  {
    "id": "english-163",
    "language": "english",
    "languageLabel": "English",
    "number": 163,
    "title": "‘Tis a glorious Church without sport nor wrinkle",
    "lyrics": "‘Tis a glorious Church without\nsport nor wrinkle\nWashed in the Blood of the Lamb\n‘Tis a glorious Church without spot\nor wrinkle,\nWashed in the Blood of the Lamb\nPH 76"
  },
  {
    "id": "english-164",
    "language": "english",
    "languageLabel": "English",
    "number": 164,
    "title": "I am the Lord, I am the Lord I am the Lord that changeth not",
    "lyrics": "I am the Lord, I am the Lord\nI am the Lord that changeth not,\nI am the Lord, that changeth not\nI am the Lord that changeth not\nThat changeth not;\nI am the Lord that changeth not\nPH 127\nSarpong Asomani"
  },
  {
    "id": "english-165",
    "language": "english",
    "languageLabel": "English",
    "number": 165,
    "title": "Christ is the answer to all our problems",
    "lyrics": "Christ is the answer to all our\nproblems\nChrist is the answer to all our needs;\nSaviour, Baptiser, the greet Physician:\nO Halleluia! He’s all I need\nPH 316"
  },
  {
    "id": "english-166",
    "language": "english",
    "languageLabel": "English",
    "number": 166,
    "title": "The Fire is burning in my soul The fire is burning in my soul",
    "lyrics": "The Fire is burning in my soul\nThe fire is burning in my soul;\nThe flame of glory maketh whole,\nHallelujah! It’s burning in my soul.\nPH 26,\nHugh Mitchell"
  },
  {
    "id": "english-167",
    "language": "english",
    "languageLabel": "English",
    "number": 167,
    "title": "He set me free, Yes, He set me free",
    "lyrics": "He set me free, Yes, He set me free\nHe broke the bonds of prison for me\nI’m glory bound my Jesus to see,\nO praise the Lord, He set me free.\nPH 4"
  },
  {
    "id": "english-168",
    "language": "english",
    "languageLabel": "English",
    "number": 168,
    "title": "We are able to go up and take the country",
    "lyrics": "We are able to go up and take the\ncountry\nTo possess the land from Jordan to\nthe sea;\nThough the lions may be there\nawait to hinder,\nGod will surely give the victory.\nPH. 187"
  },
  {
    "id": "english-169",
    "language": "english",
    "languageLabel": "English",
    "number": 169,
    "title": "While I was praying somebody touched me (x3)",
    "lyrics": "1. While I was praying somebody\ntouched me (x3)\nIt might have been the hands of\nthe Lord\n2. While I was wond’ring\nsomebody touched me (x3)\nIt might have been the band of\nthe Lord\n3. Glory, glory glory, somebody\ntouched me (x3)\nIt might have been the hand of\nthe Lord\nPH 99"
  },
  {
    "id": "english-170",
    "language": "english",
    "languageLabel": "English",
    "number": 170,
    "title": "Is there anybody here that loves my Jesus?",
    "lyrics": "Is there anybody here that loves\nmy Jesus?\nAnybody here that loves my Lord?\nI want to know, I want to know\nif you love my Lord.\nMy soul is happy when I love\nmy Jesus\nMy soul is happy when I love my\nLord,\nI want to know, I want to know if\nyou love my Lord\nPH. 13"
  },
  {
    "id": "english-171",
    "language": "english",
    "languageLabel": "English",
    "number": 171,
    "title": "There is victory for me, There is victory for me",
    "lyrics": "There is victory for me,\nThere is victory for me,\nIn the Blood of Christ, my Saviour\nThere is victory for me,\nFor me, yes me for me, yes me,.\nIn the Blood of Christ, my Saviour:\nThere is victory."
  },
  {
    "id": "english-172",
    "language": "english",
    "languageLabel": "English",
    "number": 172,
    "title": "Praises to the Lamb of God, Who shed His blood on the cross",
    "lyrics": "Praises to the Lamb of God,\nWho shed His blood on the cross\nTo redeem my soul from sin,\nFor His heavenly home,\nThank You, Jesus\nPraises to Thy name; (2)\nO my Lord deep in my heart\nRender my thanks to Thee"
  },
  {
    "id": "english-173",
    "language": "english",
    "languageLabel": "English",
    "number": 173,
    "title": "Give me oil in my lamp, keep me burning",
    "lyrics": "Give me oil in my lamp, keep me\nburning,\nGive me oil in my lamp, I pray,\nGive me oil in my lamp, keep me\nburning\nKeep me burning till the break of\nday.\nChorus\nSing Hosanna! Sing Hossana!\nSing Hossana!  To the King of\nKings!\nSing Hossana! Sing Hossana!\nSing Hossana!  To the King\nPH 34"
  },
  {
    "id": "english-174",
    "language": "english",
    "languageLabel": "English",
    "number": 174,
    "title": "Hark! The herald-angles sing Glory to the new-born King",
    "lyrics": "1. Hark! The herald-angles sing\nGlory to the new-born King\nPeace on earth, and mercy mild.\nGod and sinners reconciled\nJoyful, all ye nations rise,.\nJoin the triumph of the skies;\nWith the angelic host proclaim\n‘Christ is born in Bethlehem’\nChorus\nHark! The herald-angels sing\nGlory to the new-born King\n2. Christ, by highest heaven\nadored,\nChrist, the everlasting Lord\nLate in time behold him come\nOffspring of a virgin’s womb\nVeiled in flesh the Godhead see!\nHail, the incarnate deity!\nPleased as a man with man to\ndwell,\nJesus, our Emmanuel.\n3. Hail, the heaven-born Prince of\npeace!\nHail, the sun of righteousness!\nLight and life to all he brings,\nRisen with healing in his wings,\nMild he lays his glory by\nBorn that man no more may die\nBorn to raise the sons of earth,\nBorn to give them second birth\nBBC songs 46\nCharles Wesley (1707-88) altd."
  },
  {
    "id": "english-175",
    "language": "english",
    "languageLabel": "English",
    "number": 175,
    "title": "Brightest and best of the sons of the morning",
    "lyrics": "1. Brightest and best of the sons of\nthe morning\nDawn on our darkness, and lead\nus thine aid\nStar of the East, the horizon\nadorning,\nGuide where our infant\nRedeemer is laid\n2. Cold on His cradle the dew-\ndrops are shinning\nLow lies His head with the\nbeasts of the stall\nAngels adore Him in slumber\nreclining\nMaker, and Monarch, and\nSaviour of all.\n3. Say, shall we yield Him, in costly\ndevotion\nOdours of Edom, and offerings\ndivine\nGems of the mountain and pearls\nof the ocean\nMyrrh from the forest or gold\nfrom the mine\n4. Vainly we offer each ample\noblation\nVainly with gifts would His\nfavour secure\nRicher by far is the heart’s\nadoration\nDearer to God are the prayers\nof the poor\n5. Brightest and best of the sons of\nthe morning\nDawn on our darkness, and lend\nus thine aid\nStar of the East, the horizon\nadorning\nGuide where our infant\nRedeemer is laid\nMHB 122\nReginald Heber, 1783-1826"
  },
  {
    "id": "english-176",
    "language": "english",
    "languageLabel": "English",
    "number": 176,
    "title": "Ah! Lord God, thou has made the heavens and the earth by Thy Great",
    "lyrics": "Ah! Lord God, thou has made the\nheavens and the earth by Thy Great\npower\nAh! Lord God, thou hast made the\nheavens and the earth by Thy\noutstretched arms\nNothing is too difficult for thee!\nNothing is too difficult for thee!\nGreat and might God\nGreat in Counsel and might indeed\nNothing, Nothing, Absolutely\nnothing\nNothing is too difficult for thee."
  },
  {
    "id": "english-177",
    "language": "english",
    "languageLabel": "English",
    "number": 177,
    "title": "Show us thy glory O Lord Show us thy glory O Lord",
    "lyrics": "Show us thy glory O Lord\nShow us thy glory O Lord\nLet the dew of heaven bring us\nrefreshing\nAnd show us thy glory once more."
  },
  {
    "id": "english-178",
    "language": "english",
    "languageLabel": "English",
    "number": 178,
    "title": "Happiness is to know the Saviour",
    "lyrics": "1. Happiness is to know the\nSaviour\nLiving a life within His favour\nHaving a change in my behaviour\nHappiness is the Lord\n2. Happiness is a new creation\nJesus and me in close relation\nHaving a part in His Salvation\nHappiness is the Lord\nReal Joy is mine\nNo matter if tear drops start\nI’ve found the secret\n‘Tis Jesus in my heart\n3. Happiness is to be forgiven\nLiving a life that’s worth the\nliving\nTake a trip that leads to heaven\nHappiness is the Lord\nHappiness is the Lord\nHappiness is the Lord"
  },
  {
    "id": "english-179",
    "language": "english",
    "languageLabel": "English",
    "number": 179,
    "title": "Hark the voice of Jesus crying Who will go and work today?",
    "lyrics": "1. Hark the voice of Jesus crying\nWho will go and work today?\nFields are white and harvest\nwaiting\nWho will bear the sheaves away\nLoud and strong the Master\ncalleth\nRich reward He offers thee\nWho will answer gladly saying\nHere am I, send me! Send me!\n2. If you cannot speak like angels\nIf you cannot preach like Paul\nYou can tell the love of Jesus\nYou can say He died for all\nIf you cannot rouse the wicked\nWith the judgement dread\nalarms\nYou can lead the little children\nTo the Saviour’s waiting arms\n3. If among the older people\nYou may not be apt to teach\n“Feed my lambs” said Christ our\nShepherd\nPlace the food within their reach\nAnd it may be that the children\nYou have led with trembling arms\nWill be found among the jewels\nWhen you reach the better land\n4. Let none hear you idly saying\n“There is nothing I can do”\nWhile the souls of men are dying\nAnd the Master calls for you\nTake the task He gives you gladly\nLet His work your pleasure be\nAnswer quickly when he calleth\n“Here am I, send me! Send me!"
  },
  {
    "id": "english-180",
    "language": "english",
    "languageLabel": "English",
    "number": 180,
    "title": "Saviour, blessed Saviour, Listen whilst we sing",
    "lyrics": "1. Saviour, blessed Saviour,\nListen whilst we sing,\nHeart and voices raising\nPraises to our King;\nAll we have to offer,\nAll we hope to be,.\nBody, soul, and spirit\nAll  we yield to Thee.\n2. Nearer, ever nearer\nChrist, we draw to Thee,\nDeep in adoration\nBending low the knee:\nThou, for our redemption,\nCam’st on earth to die;\nThou, that we might follow\nHast gone up on high\n3. Clearer still, and clearer\nDawns the light from heaven,\nIn our sadness bringing\nNews of sin forgiven;\nLife has lost its shadows,\nPure the light within\nOn a world of sin\n4. Onward, ever onward\nJourneying o’er the road\nWorn by saints before us,\nJourneying on to God;\nLeaving all behind us,\nMay we hasten on Backward\nnever looking\ntill the prize is won\n5. Higher, then, and higher\nBear the ransomed soul,\nEarthly toils forgotten,\nSaviour, to its goal;\nwhere, in joys unthought of,\nSaints with angels sing,\nNever, weary, raising\nPraise to their King.\nGolden Bells 25"
  },
  {
    "id": "english-181",
    "language": "english",
    "languageLabel": "English",
    "number": 181,
    "title": "Come, ye that love the Lord, And let your joys be known",
    "lyrics": "1. Come, ye that love the Lord,\nAnd let your joys be known\nJoin in a song with sweet\naccord, (x2)\nAnd thus surround the throne,\n(2)\nChorus\nWe’re marching to Zion\nBeautiful, beautiful Zion;\nWe’re marching upward to zion,\nThe beautiful city of God.\n2. Let those refuse to sing\nWho never knew our God;\nBut children of the heavenly\nKing (2)\nMust speak their joys abroad (2)\n3. The hill of Zion yields\nA thousand sacred sweets,\nBefore we reach the heavenly\nfields, (2)\nOr walk the golden streets\n4. Then let our songs abound,\nAnd every tear be dry;\nWe’re marching through\nImmanuel’s ground (2)\nTo fairer worlds on high (2)\nGolden Bells 31"
  },
  {
    "id": "english-182",
    "language": "english",
    "languageLabel": "English",
    "number": 182,
    "title": "“Whosoever hearth!” Shout, shout, the sound!",
    "lyrics": "1. “Whosoever hearth!” Shout,\nshout, the sound!\nSend the blessed tidings all the\nworld around!\nSpread the joyful news\nwherever man is found\n“Whosoever will may come\nChorus\n“Whosoever will! Whosoever will!\nSend the proclamation over\nvale and hill!;\n‘Tis a loving Father calls the\nwanderer home\n“Whosoever will may come!”\n2. “Whosoever cometh! needed\nnot delay;\nNow the door is open, enter\nwhile you may;\nJesus is the true, the only Living\nway;\n“Whosoever will may come”\n3. “Whosoever will! the promise is\nsecure;\n“Whosoever will! for ever shall\nendure;\n“Whosoever will” ‘tis life for\nevermore;\n“Whosoever will may come!”\nGolden Bells 228"
  },
  {
    "id": "english-183",
    "language": "english",
    "languageLabel": "English",
    "number": 183,
    "title": "Courage, brother! do no tumble, Though thy path be dark as",
    "lyrics": "1. Courage, brother! do no tumble,\nThough thy path be dark as\nnight;\nThere’s a star to guide the\nhumble;\n“Trust in God, and do the right”\n2. Let the road be rough and dreary,\nAnd its end far out of sight\nFoot it bravely! strong or weary,\n“Trust in God, and do the right”\n3. Perish policy and cunning\nPerish all that fears the light!\nWhether losing, whether winning,\nTrust in God, and do the right”\n4. Simple rule, and safest guiding,\nInward peace, and inward light\nStar up our path abiding -\n“Trust in God and do the right”\n5. Some will hate thee, some will\nl ove thee,\nSome will flatter, some will\nslight;\nCease from man, and look\nabove thee;\n“Trust in God and do the right”\n6. Courage, brother! do not\nstumble,\nthough thy path be dark as\nnight;\nthere’s a star to guide the\nhumble;\n“Trust in God and do the right”\nGolden Bells 354"
  },
  {
    "id": "english-184",
    "language": "english",
    "languageLabel": "English",
    "number": 184,
    "title": "Sowing in the morning, sowing seeds of kindness",
    "lyrics": "1. Sowing in the morning, sowing\nseeds of kindness\nSowing in the noontide and the\ndewy eves;\nWaiting for the harvest, and the\ntime of reaping\nWe shall come rejoicing,\nbringing in the sheaves!\nChorus\nBringing in the sheaves!\nBringing in the sheaves!\nWe shall come rejoicing\nBringing in the sheaves! (2)\n2. Sowing in the sunshine, sowing\nin the shadows\nFearing neither clouds nor\nwinters\nchilling breeze\nBy and by the harvest, and the\nlabour ended\nWe shall come rejoicing,\nbringing in the sheaves!\nGolden Bells 438"
  },
  {
    "id": "english-185",
    "language": "english",
    "languageLabel": "English",
    "number": 185,
    "title": "I love to tell the Story Of unseen things above",
    "lyrics": "1. I love to tell the Story\nOf unseen things above,\nOf Jesus and His glory\nOf Jesus and His love;\nI love to tell the Story\nBecause I know it’s true;\nIt satisfies my longings\nAs nothing else would do.\nChorus\nI love to tell the Story\n“I will be my theme in glory\nTo tell the old, old Story\nOf Jesus and His love\n2. I love to tell the Story\nMore wonderful! it seems\nThan all the golden fancies\nOf all our golden dreams;\nI love to tell the Story\nIt did so much for me;\nAnd that is just the reason\nI tell it now to thee.\n3. I love to tell the Story\n‘Tis pleasant to repeat\nWhat seems, each time I tell it,\nMore wonderfully sweet;\nI love to tell the Story,\nFor some have never heard\nThe message of salvation\nFrom God’s own holy Word.\n4. I love to tell the Story;\nFor those who know it best\nSeem hungering and thirsting\nTo hear it like the rest;\nAnd when in scenes of glory\nI sing the new, new song,\n‘Twill be the old, old Story\nThat I have loved so long\nGolden Bells 444"
  },
  {
    "id": "english-186",
    "language": "english",
    "languageLabel": "English",
    "number": 186,
    "title": "My Saviour, I love Thee, I know Thou art mine",
    "lyrics": "1. My Saviour, I love Thee, I know\nThou art mine\nFor Thee all the pleasures of sin\nI resign;\nMy gracious Redeemer, my\nSaviour, art Thou\nIf ever I loved thee, my Saviour\n‘tis now.\n2. I love Thee because Thou hast\nfirst loved me\nAnd purchased my pardon on\nCalvary’s tree\nI love Thee for wearing the\nthorns on Thy brow\nIf ever I love Thee, my Saviour\n‘tis now.\n3. In mansions of glory and\nendless delight;\nI’ll ever adore Thee in heaven so\nbright;\nI’ll sing, with the glittering\ncrown on my brow;\n“If ever I love thee, my Saviour\n‘tis now\nGolden Bells 461"
  },
  {
    "id": "english-187",
    "language": "english",
    "languageLabel": "English",
    "number": 187,
    "title": "There’s a fight to be fought, and a race to run",
    "lyrics": "1. There’s a fight to be fought, and\na race to run\nThere are dangers to meet by\nthe way;\nBut the Lord is my light and the\nLord is my life\nAnd the Lord is my strength and\nstay\nOn His word I depend, He’s my\nSaviour and Friend;\nAnd He tells me to trust and obey;\nFor the Lord is my light and the\nLord is my life\nAnd the Lord is my strength and\nstay.\n2. In  His wonderful love, He\ncame down from above\nTo suffer and die on the tree\nNow He’s reigning up there;\nwhere He’s gone to prepare\nA place in His Kingdom for me\nLet us sing as we go, for He\nloveth us so\nWe can never be lost by the way;\nFor the Lord is our light and the\nLord is our life\nAnd the Lord is our strength\nand stay.\n3. Then He’ll bring us at length, by\nHis infinite strength\nTo the land that is fairer than day;\nFor the Lord is my light and the\nLord is my life\nand the Lord is my strength and\nstay\nSo we’ll sing to His praise, to the\nend of our days\nAs we travel each dangerous way;\nFor the Lord is my light and the\nLord is my life\nAnd the Lord is my strength and\nstay\nGolden Bells 539"
  },
  {
    "id": "english-188",
    "language": "english",
    "languageLabel": "English",
    "number": 188,
    "title": "We love the blessed the Bible The glorious Word of God",
    "lyrics": "1. We love the blessed the Bible\nThe glorious Word of God;\nThe lamp for those who travel\nO’er all life’s dreary road\nThe watchword in life’s battle\nThe chart on life’s dark sea;\nThe everlasting Bible\nIt shall our teacher be.\n2. Who would not love the Bible\nSo beautiful and wise!\nIts teaching charm and the simple,\nAnd all point to the skies,\nIts stories all so might\nOf men so brave to see,\nDivinely-given Bible\nIt shall our teacher be.\n3. But most we love the Bible,\nFor there we Children learn\nHow Christ took on our\nchildhood,\nOur hearts to Him to turn;\nAnd how He bowed to sorrow,\nThat we His face might see;\nThe Bible, oh! the Bible-\nIt shall our teacher be\n4. Then we will hold the Bible -\nThe glorious Book of God;\nWe’ll ne’er forsake the Bible,\nThrough all life’s future road.\nAnd when we shall be dying,\nWhenever that may be,\nThe comfort of the Bible\nshall still our solace be."
  },
  {
    "id": "english-189",
    "language": "english",
    "languageLabel": "English",
    "number": 189,
    "title": "God be with you till we meet again!",
    "lyrics": "1. God be with you till we meet\nagain!\nBy His counsel guide, uphold\nyou;\nWith His sheep securely fold you;\nGod be with you till we meet again!\nChorus\nTill we meet  ... Till we meet ...\nTill we meet at Jesus’  feet...\nTill we meet  ... Till we meet ...\nGod be with you till we meet\nagain\n2. God be with you till we meet\nagain!\n‘Neath His wings securely hid you\nDaily manna still provide you;\nGod be with you till we meet\nagain!\n3. God be with you till we meet\nagain!\nWhen life’s perils thick\nconfound you.\nPut His love arms around you;\nGod be with you till we meet\nagain!\n4. God be with you till we meet again!\nKeep love’s banner floating o’er\nyou\nSmite death’s threatening wave\nbefore you\nGod be with you till we meet again!\nGolden Bells 699"
  },
  {
    "id": "english-190",
    "language": "english",
    "languageLabel": "English",
    "number": 190,
    "title": "Yesterday, to-day, forever Jesus is the same",
    "lyrics": "Yesterday, to-day, forever\nJesus is the same;\nAll may change, but Jesus never,\nGlory to His Name!\nGlory to His Name, glory to His\nName\nAll may change, but Jesus never\nGlory to His Name\nLiving Songs 54"
  },
  {
    "id": "english-191",
    "language": "english",
    "languageLabel": "English",
    "number": 191,
    "title": "It is no longer I that liveth, but",
    "lyrics": "It is no longer I that liveth, but\nChrist that liveth in me\nIt is no longer I that liveth, but\nChrist that liveth in me\nIt is no longer I that liveth, but\nChrist that liveth in me.\nLiving Songs 64"
  },
  {
    "id": "english-192",
    "language": "english",
    "languageLabel": "English",
    "number": 192,
    "title": "He is my everything, He is my all He is my everything, both great",
    "lyrics": "1. He is my everything, He is my all\nHe is my everything, both great\nand small\nHe gave His life for me\nMade everything new;\nHe is my everything\nAnd what about you?\n2. Some folks may ask me, some\nfolks may say,\nWho is this Jesus, you talk\nabout every day?\nHe is my Saviour,\nHe set me free\nNow listen while I tell you\nWhat He means to me.\n3. He is my everything, He is my all;\nHe is my everyting, both great\nand small\nHe gave His life for me,\nMade everything new,\nHe is my everything\nAnd what about you?\nLiving Songs 73"
  },
  {
    "id": "english-193",
    "language": "english",
    "languageLabel": "English",
    "number": 193,
    "title": "This world not my home I’m just a passing through",
    "lyrics": "1. This world not my home\nI’m just a passing through\nMy treasures are laid up\nSomewhere beyond the blue;\nThe Saviour beckons me\nFrom heaven open door\nAnd I can’t feel at home\nIn this world any more\nChorus\nO Lord, You know\nI have no friend like You:\nIf heaven’ s not my home\nThen, Lord what will I do?\nThe Saviour beckons me\nFrom Heaven’ s open door,\nAnd I can’t feel at home in this\nworld any more\n2. They’re all expecting me,\nAnd that’s one things I know;\nMy Saviour pardoned me,\nNow onward I must go;\nI know He’ll take me through,\nThough I am weak and poor,\nAnd  I can’t feel at home\nIn this world any more.\n3. Just over in glory land\nWe’ll live eternally,\nThe saints on every hand\nAre shouting victory;\ntheir songs of sweetest praise\nDrift back from Heaven’s shore\nAnd I can’t feel at home\nIn this world any more.\nLiving songs 112"
  },
  {
    "id": "english-194",
    "language": "english",
    "languageLabel": "English",
    "number": 194,
    "title": "We are often tossed and driv’n On the restless sea of time",
    "lyrics": "1. We are often tossed and driv’n\nOn the restless sea of time,\nSombre skies and howling tempest\nOft succeed a bright sun-shine\nIn that land of perfect day,\nWhen the mists have rolled away\nWe will understand it better by\nand by\nChorus\nBy and by when the morning\ncomes\nWhen all the saints of God are\ngathered home\nWe’ll tell the story how we’ve\novercome;\nFor We’ll understand it better\nby and by\n2. We are often destitute\nof the things that life demands,\nWant of food and want of shelter\nThirsty hills and barren lands,\nWe are trusting in the Lord,\nAnd according to His Word,\nWe will understand it better by\nand by\n3. Trials dark on ev’ery hand,.\nAnd we cannot understand\nall the ways that God would lead us\nTo that blessed Promised Land;\nBut He guides us with His eye\nAnd we’ll follow till we die\nFor we’ll understand it better by\nand by\n4. Temptation, hidden snares\nOften take us unawares,\nAnd our hearts are made to bleed\nfor many a thought-less word or\ndeed,\nAnd we wonder why the test\nWhen we try to do our best\nBut we’ll understand it better by\nand by\nMelodies of Praise 91"
  },
  {
    "id": "english-195",
    "language": "english",
    "languageLabel": "English",
    "number": 195,
    "title": "For God so love this sinful world",
    "lyrics": "1. For God so love this sinful world,\nHis Son He freely gave,\nThat whatsoever would believe,\nEternal life should have.\nChorus\n‘Tis true, oh, yes, ‘tis true\nGod’ s wonderful promised is\ntrue,\nFor I’ve trusted, and tested\nand tried it,\nAnd I know god’ s promise is true\n2. I was a way-ward, wand’ring\nchild\nA slave to sin and fear,\nUntil this blessed promise fell\nLike music on my ear\n3. The “whosoever of the Lord,\nI trusted was for me;\nI took Him at His gracious Word,\nFrom sin He set me free\n4. Eternal life, begun below,\nNow fills my heart and soul;\nI’ll sing His praise forever-more,\nWho has redeemed my soul.\nMelodies of Praises 128"
  },
  {
    "id": "english-196",
    "language": "english",
    "languageLabel": "English",
    "number": 196,
    "title": "Oh, what a wonderful day, Day I will never forget",
    "lyrics": "1. Oh, what a wonderful day,\nDay I will never forget,\nAfter I’d wandered in darkness\naway,\nJesus my Saviour I met\nOh, what a tender,\ncompassionate friend,\nHe met the need of my heart;\nShadows dispelling, with joy I\nam telling\nHe made all the darkness depart!\nChorus\nHeaven came down and glory\nfilled my soul\nWhen at the Cross the Saviour\nmade me whole;\nMy sins were washed away\nAnd my night was turned to day\nHeaven came down and glory\nfilled my soul!\n2. Born of the Spirit with life from\nabove\nInto God’s family divine;\nJustified fully through Calvary’s\nlove\nOh, what a standing is mine!\nAnd the transaction so quickly\nwas made\nWhen as a sinner I came\nTook of the offer of grace He\ndid proffer\nHe saved me, Oh, praise His\ndear Name\n3. Now I’ve a hope that will surely\nendure\nAfter the passing of time;\nI have a future in Heaven for sure,\nThere is those mansions sublime\nAnd it’s because of that\nwonderful day\nWhen at the Cross I believed;\nRiches and eternal and\nblessings supernal\nFrom His righteous hand I received\nLiving Songs 70"
  },
  {
    "id": "english-197",
    "language": "english",
    "languageLabel": "English",
    "number": 197,
    "title": "Through all the changing scene of life",
    "lyrics": "1. Through all the changing scene\nof life\nIn trouble and in joy\nThe praises of my God shall still\nMy heart and tongue employ\n2. Of His deliverance I will boast\ntill all that are distressed\nFrom my example comfort take,\nAnd charm their griefs to rest\n3. O magnify the Lord with me,\nWith me exalt His name;\nWhen in distress to Him called,\nHe to my rescue came\n4. The Hosts of God encamp\naround\nThe dwelling of the just;\nDeliverance He affords to all\nWho on His succour trust\n5. O make but trial of  his love;\nExperience will decide\nHow blest they are, and only they,\nWho in His truth confide.\n6. Fear Him, ye saints, and you will\nthen\nHave nothing else to fear\nMake you His service your delight\nHe’ll make your wants His Care\nMHB 427"
  },
  {
    "id": "english-198",
    "language": "english",
    "languageLabel": "English",
    "number": 198,
    "title": "Thou art worthy (2) Thou are worthy, O Lord",
    "lyrics": "1. Thou art worthy (2)\nThou are worthy, O Lord\nThou art worthy to receive glory\nGlory and honour and power\nFor Thou hast created\nHast all things created\nFor thou hast created all things\nAnd for Thy pleasure they are\nCreated;\nThou art worthy, O Lord\n2. Thou art worthy (2)\nThou art worthy, O Lord\nThou art worthy to receive\nblessing\nRiches  and wisdom and power\nFor Thou has redeemed us,\nThy blood hast redeemed us,\nFor thou hast redeemed us to\nGod;\nAnd from all nations made us a\nkingdom\nThou art worthy, O Lord\nLiving  Songs 36"
  },
  {
    "id": "english-199",
    "language": "english",
    "languageLabel": "English",
    "number": 199,
    "title": "Let the beauty of Jesus be seen in me",
    "lyrics": "Let the beauty of Jesus be seen\nin me\nAll His wondrous compassion\nand purity\nOh Thou spirit divine, all my\nnature refine\nTill the beauty of Jesus be seen\nin me."
  },
  {
    "id": "english-200",
    "language": "english",
    "languageLabel": "English",
    "number": 200,
    "title": "Jesus, Friend of my soul Draws me close to know",
    "lyrics": "1. Jesus, Friend of my soul\nDraws me close to know\nThe loving Father's desire\nThat keeps on seeking me\nRefrain\nIf I really meet You\nI will worship You in truth\nWorship You in Spirit\nNever turn You down\n2. Jesus Friend of my soul\nAm searching for You\nYet You are with me\nHelp me know You are close\n3. Jesus, Friend of my soul\nNo longer I hear You\nHelp me clearly discern\nYou are always with me.\n4. Jesus, Friend of my soul\nHas drawn me to Eternal God\nI've known the depth of Your\nlove\nIn joy I worship You\nOpoku Onyinah, 2012"
  },
  {
    "id": "english-201",
    "language": "english",
    "languageLabel": "English",
    "number": 201,
    "title": "Here I am, Oh Lord, Ready to be poured on the altar",
    "lyrics": "1. Here I am, Oh Lord,\nReady to be poured on the altar\nPierce my ears, Oh Lord,\nReady to be used for Your\nservice.\nConsecrated unto You, my Lord,\nTo bear Your marks in my body\n(2x)\n2. To your cross I come,\nReady to share in Your suf-fer-ing\nTo the field I go,\nReady to keep watch over Your\nflock.\nTouch my ears, my eyes, my\nmouth, Oh Lord,\nTo do the works of Your Father\n(2x)\n3. Lifting hands to You,\nReady to carry Ark of Covenant\nNothing do I hold,\nReady to take on Your sacred\ncharge.\nBreak my flesh, my will, my\nstrength, Oh Lord\nTo use me as Your good servant\n(2x)\nOpoku Onyinah, 2012"
  },
  {
    "id": "english-202",
    "language": "english",
    "languageLabel": "English",
    "number": 202,
    "title": "He reigns, He reigns, He reigns My Jesus ever reigns",
    "lyrics": "He reigns, He reigns, He reigns\nMy Jesus ever reigns\nEvery knee shall bow\nEvery tongue'll confess\nThat Jesus reigns forevermore\nEunice Johnson"
  },
  {
    "id": "english-203",
    "language": "english",
    "languageLabel": "English",
    "number": 203,
    "title": "Who am I to boast In Your Presence?",
    "lyrics": "1. Who am I to boast In Your\nPresence?\nDust and clay, I was made of\nAdam's seed, I'm flesh and\nblood\nI am saved by your grace\nIt's only grace\nIt is grace that sets me free\nIt's only grace\nSurely grace will sail me through\n2. On my knees, I am before your\nthrone\nJar of clay, weak and feeble\nBy nature, I am a child of wrath\nMy only hope is your grace\nIt's only grace\nIt is grace that makes me whole\nIt's only grace\nSurely grace will take me home\nOpoku Onyinah, 2012"
  },
  {
    "id": "english-204",
    "language": "english",
    "languageLabel": "English",
    "number": 204,
    "title": "You are the only Lord, Jesus We bow and worship You",
    "lyrics": "You are the only Lord, Jesus\nWe bow and worship You\nYour Name, we glorify, Jesus\nYou deserve glory\nWe lift Your Name on high,\nJesus\nYour name is so great\nYou are the only Lord, Jesus\nWe worship You (x2)\nOpoku Onyinah"
  },
  {
    "id": "english-205",
    "language": "english",
    "languageLabel": "English",
    "number": 205,
    "title": "Your name is great above all names",
    "lyrics": "Your name is great above all\nnames,\nWe praise your Holy name 2x\nWe praise your Holy name,\nWe praise your Holy name\nYour name is great above all\nnames,\nWe praise your Holy name 2x\nGrace Gakpetor"
  },
  {
    "id": "english-206",
    "language": "english",
    "languageLabel": "English",
    "number": 206,
    "title": "Jesus is Lord 4x He is the King of kings 3x",
    "lyrics": "Jesus is Lord 4x\nHe is the King of kings 3x\nHe is Lord\nHe is the King of kings 3x\nHe is Lord\nEunice Johnson"
  },
  {
    "id": "english-207",
    "language": "english",
    "languageLabel": "English",
    "number": 207,
    "title": "You are Awesomely Wonderful God",
    "lyrics": "You are Awesomely Wonderful\nGod\nCreator God, Almighty God,\nYou are awesomely wonderful\nGod\nOmnipotent God, there is none\nlike you\nWe worship You\nGrace Gakpetor, 2012"
  },
  {
    "id": "english-208",
    "language": "english",
    "languageLabel": "English",
    "number": 208,
    "title": "From ages to ages He is God indeed",
    "lyrics": "1. From ages to ages He is God\nindeed;\nHe will come revealing Himself\nin His time;\nIn seasons of old; His own He\nredeemed;\nHe will come in season, God of\nAbraham\n2. From ages to ages He is God\nindeed;\nHe will come revealing Himself\nin His time;\nFrom Pharaoh the king, He set\nIsrael free;\nHe will come in season, God of\nAbraham\n3. From ages to ages He is God\nindeed;\nHe will come revealing Himself\nin His time;\nIn dry desert lands His large\nband He fed;\nHe will come in season, God of\nAbraham\n4. From ages to ages He is God\nindeed;\nHe will come revealing Himself\nin His time;\nFrom hot oven flames His\nservants He saved;\nHe will come in season, God of\nAbraham\n5. From ages to ages He is God\nindeed;\nHe will come revealing Himself\nin His time;\nFor He is the God that we serve\ntoday;\nHe will come in season, God of\nAbraham\nEunice Johnson, P ANT (3) 1276"
  },
  {
    "id": "english-209",
    "language": "english",
    "languageLabel": "English",
    "number": 209,
    "title": "Glorious Lord of lords 2x Praise be to you forevermore",
    "lyrics": "Glorious Lord of lords 2x\nPraise be to you forevermore\nGlorious Lord of lords\nSeth Asare Ofei Badu\nP ANT (3) 1267\n1. As I live; I will praise you;\nAs I live; My heart will worship;\nFor you are God; For you are\nGod;\nHoly is the Lord our God; 3x\nFor you are God; For you are\nGod\n2. I Breathe; I will praise you;\nAs I Breathe; My heart will\nworship;\nFor you are God; For you are\nGod\nHoly is the Lord our God; 3x\nFor you are God; For you are\nGod\nDaniel Akakpo"
  },
  {
    "id": "english-210",
    "language": "english",
    "languageLabel": "English",
    "number": 210,
    "title": "Great Provider, He cares for you; He will provide all your needs",
    "lyrics": "1. Great Provider, He cares for you;\nHe will provide all your needs;\nAccording to His glorious\nriches;\nHe cares, and will provide\n2. In times of need do not be\ntroubled;\nHe will provide all your needs;\nJust trust in Him, He will\nprovide;\nHe cares, and will provide\nFrancis Agyemang Badu\nP ANT (3) 1320"
  },
  {
    "id": "english-211",
    "language": "english",
    "languageLabel": "English",
    "number": 211,
    "title": "Greater one is our God; None like Him, He is within",
    "lyrics": "Greater one is our God;\nNone like Him, He is within;\nAlmighty, Sovereign One,\nOur God is great, far above all;\nOur God is great,\nHe is great, greater than all;\nOur God is great,\nHe is great, far above all\nOpoku Onyinah"
  },
  {
    "id": "english-212",
    "language": "english",
    "languageLabel": "English",
    "number": 212,
    "title": "Jehovah God, Who over rules",
    "lyrics": "1. Jehovah God,\nWho over rules;\nI trust in You forevermore\nRefrain\nAt Your mercies Lord 2x;\nStanding in Your presence;\nJehovah God, the Lord of Hosts;\nYour will be done\n2. The Most High God,\nThe God we serve;\nYou are our hope in times of\ntrouble\nOpoku Onyinah"
  },
  {
    "id": "english-213",
    "language": "english",
    "languageLabel": "English",
    "number": 213,
    "title": "Jesus Christ I come to you; There is none like you O God",
    "lyrics": "Jesus Christ I come to you;\nThere is none like you O God;\nYou are far above all;\nYou are great, God;\nKing of kings; Lord of lords;\nFar above all things;\nYou are great, God\nOpoku Onyinah"
  },
  {
    "id": "english-214",
    "language": "english",
    "languageLabel": "English",
    "number": 214,
    "title": "Light of God, lead me on; In my pilgrimage",
    "lyrics": "Light of God, lead me on;\nIn my pilgrimage;\nYour guidance I need\nTo be victorious\nE. K. Asamoah\nP ANT (3) 1258"
  },
  {
    "id": "english-215",
    "language": "english",
    "languageLabel": "English",
    "number": 215,
    "title": "To be like Jesus, to be like Jesus",
    "lyrics": "To be like Jesus, to be like\nJesus;\nAll I ask is to be like Him;\nThrough all life's journey;\nFrom earth to glory;\nAll I ask is to be like Him\nP ANF 405"
  },
  {
    "id": "english-216",
    "language": "english",
    "languageLabel": "English",
    "number": 216,
    "title": "Behold what I behold; And hear ye what I hear:",
    "lyrics": "Behold what I behold;\nAnd hear ye what I hear:\nJesus is Life, He gives life;\nEverlasting life\nP B Appiah Adu,\nP ANT (3) 1141"
  },
  {
    "id": "english-217",
    "language": "english",
    "languageLabel": "English",
    "number": 217,
    "title": "Cover me with the Cloud of glory",
    "lyrics": "1. Cover me with the Cloud of\nglory;\nLight my path, O Pillar of Fire;\nLead me through this crimson\nsea;\nSafely to yonder shore\n2. Spirit Divine, You're a Pill'r of\nFire;\nLamp for my feet, Light for my\npath;\nGuide me in this barren land;\nSafely home in Your hands\n3. You are my Lamp, Lord, through\nthis journey;\nShine upon me on earth below;\nThrough death's darkness to\nThy light\nIn palaces above\n4. Shine upon me, O shine upon\nme;\nLight of the Holy Spirit, shine;\nAll my days, Lord, shine for me;\nI pray, Lord, ever shine.\nEunice Johnson\nP ANT (3) 1432"
  },
  {
    "id": "english-218",
    "language": "english",
    "languageLabel": "English",
    "number": 218,
    "title": "Let Your anointing fall on us; Let Your grace abound",
    "lyrics": "Let Your anointing fall on us;\nLet Your grace abound;\nLet Your Holy Power;\nDwell upon us\nSeth Asare Ofei Badu,\nP ANT (3) 1253"
  },
  {
    "id": "english-219",
    "language": "english",
    "languageLabel": "English",
    "number": 219,
    "title": "Before Your throne I stand In Heaven's Holiest place",
    "lyrics": "1. Before Your throne I stand\nIn Heaven's Holiest place\nPresence of Almighty\nFull of goodness and grace\nMy cup has overflowed\nAll goodness is now mine\nMy heart is full of Your praise\n2. Your Presence I desire\nWhat rest I find in you\nYour presence soothes my heart\nSurrounded by Your love\nYou make my mouth so full\nI will sing of Your praises\nMy heart is full of Your praise\n3. Around Your holy throne\nWhere angles surround You\nAdoring You always\nYour saints jointly declare\nYou are the only Lord\nWe glorify your name\nMy heart is full of Your praise\n4.  Grace and Mercy descend\nFrom heavens holiest throne\nUpon the sons of God\nReceiving grace on grace\nEternal God you are:\nYour grace will never cease\nMy heart is full of your praise\nOpoku Onyinah"
  },
  {
    "id": "english-220",
    "language": "english",
    "languageLabel": "English",
    "number": 220,
    "title": "With my lips I will praise you Lord",
    "lyrics": "With my lips I will praise you\nLord;\nThese my lips shall praise Your\nname;\nWith my lips I will lift You up;\nTill the whole world come to\nsee;\nThey shall tell of Your\nsalvation;\nTo the lost and weary souls;\nWith my lips I will praise you\nLord;\nThese my lips shall praise Your\nname\nGrace Gakpetor"
  },
  {
    "id": "english-221",
    "language": "english",
    "languageLabel": "English",
    "number": 221,
    "title": "Mighty warrior, man of valour; Children of grace, children of",
    "lyrics": "Mighty warrior, man of valour;\nChildren of grace, children of\npeace;\nBlow the trumpet in Zion;\nLet the weak say I am strong;\nVictory, great victory;\nThe army of the Lord marches on\nSamuel Tetteh Doku\nJehovah, blessed be Your Name\n2x\nAll creation glorify Your great\nName\nJehovah, blessed be Your Name\nXhosa Spiritual\nP ANT (3) 1287"
  },
  {
    "id": "english-222",
    "language": "english",
    "languageLabel": "English",
    "number": 222,
    "title": "Holy, holy, holy, holy; Holy, You fill this vast world",
    "lyrics": "Holy, holy, holy, holy;\nHoly, You fill this vast world;\nWith your majesty and glory\nO, our Lord, receive your praise\nXhosa Spiritual\nP ANT (3) 1287"
  },
  {
    "id": "english-223",
    "language": "english",
    "languageLabel": "English",
    "number": 223,
    "title": "What a Master I follow; His name is the Lord Jesus",
    "lyrics": "1. What a Master I follow;\nHis name is the Lord Jesus;\nI'll serve Him, and never deny\nHim;\nWhat a master I follow\nRefrain\nA true disciple I will be always,\nFollow Him, deny Him not;\nWill love Him, and take up my cross\nalways;\nWhat a master I follow\n2. I am a disciple of Christ;\nHe's promised He'll not leave\nme;\nI will preach and make disciples;\nI 'm a disciple of Christ\nA true ... I am a disciple of Christ\n3. On His faithful Word I'll stand;\nAnd teach others all His ways;\nThere is power for those who\nbelieve;\nOn His faithful Word I'll stand\nA true ... On His faithful Word\nI'll stand\n4. My Lord is Jesus Christ;\nAnd all pow'r belong to Him;\nHe is the world's one Saviour;\nMy Lord is Jesus Christ\nA true ... My Lord is Jesus\nChrist\n5. He has promised He's with us;\nTo the very end of the world;\nFaithful is He who has promised\nA true ... He has promised He's\nwith us\n6. The Comforter is with us;\nFrom Father and the Son;\nFaithful, He, the Holy Spirit;\nThe Comforter is with us\nA true ... The Comforter's with us\n7. I will go preaching Good News;\nThat the Christ rose from the\ndead;\nHe is King of our Salvation;\nI will go preaching Good News\nA true ... I will go preaching\nGood News\n8. He'll reward obedient ones;\nWho will walk by His good\nWord;\nMany crowns the Lord will give\nthem;\nHe'll reward obedient ones\nA true ... He'll reward obedient\nones\n9. I will be among the crowned;\nI will receive it with great joy;\nI will see the King in glory;\nI will be among the crowned.\nA true ... I will be among the\ncrowned\n10.  I'll rejoice greatly that day;\nIn the Kingdom of the Christ;\nI will sing to glorify Him;\nI'll rejoice greatly that day\nA true ...I'll rejoice greatly that\nday\nOpoku Onyinah"
  },
  {
    "id": "english-224",
    "language": "english",
    "languageLabel": "English",
    "number": 224,
    "title": "That Day of Pentecost; The source of Divine Power",
    "lyrics": "That Day of Pentecost;\nThe source of Divine Power;\nCame down from above;\nTo revive the Church\nRevival, revival, revival, revival\nRevival, revival, revival has\ncome today\nPeter Adjei"
  },
  {
    "id": "english-225",
    "language": "english",
    "languageLabel": "English",
    "number": 225,
    "title": "The Lord is the defender of the helpless",
    "lyrics": "The Lord is the defender of the\nhelpless;\nHe is the protector of the\nvulnerable;\nA mighty rock and a solid\nfortress;\nThe hope of the hopeless has\nloved you.\nPeter Adjei"
  },
  {
    "id": "english-226",
    "language": "english",
    "languageLabel": "English",
    "number": 226,
    "title": "O soul, are you weary and troubled?",
    "lyrics": "1. O soul, are you weary and\ntroubled?\nNo light in the darkness you\nsee?\nThere's a light for a look at the\nSavior,\nAnd life more abundant and\nfree!\nRefrain\nTurn your eyes upon Jesus,\nLook full in His wonderful face,\nAnd the things of earth will grow\nstrangely dim,\nIn the light of His glory and grace.\n2. Through death into life\neverlasting\nHe passed, and we follow Him\nthere;\nOver us sin no more hath\ndominion-\nFor more than conquerors we\nare!\n3. His Word shall not fail you-He\npromised;\nBelieve Him, and all will be well:\nThen go to a world that is\ndying,\nHis perfect salvation to tell!\nHelen H. Lemmel"
  },
  {
    "id": "english-227",
    "language": "english",
    "languageLabel": "English",
    "number": 227,
    "title": "Who is like You In power and glory?",
    "lyrics": "Who is like You\nIn power and glory?\nWho is like You?\nMajestic and splendorous!\nWho is like You,\nIn beauty and radiance?\nMy Jesus, the Shining One\nShine on me, Bright Morning\nStar\nShine on me, Me Closest Friend\nShine on me, Jesus, Shine one me\nOpoku Onyinah"
  },
  {
    "id": "english-228",
    "language": "english",
    "languageLabel": "English",
    "number": 228,
    "title": "We'll be like Him, When Jesus Christ the Son of",
    "lyrics": "We'll be like Him,\nWhen Jesus Christ the Son of\nGod appears,\nWe shall be like Him\nHe is changing our lives by His\npow'r\nHe is feeding our souls with His\nprecious daily Bread\nWe'll be like Him, when Jesus\nChrist the Son of God appears,\nWe shall be like Him\nTranslation of Eunice Addison's\n\"\nY1b1 s1 No\""
  },
  {
    "id": "english-229",
    "language": "english",
    "languageLabel": "English",
    "number": 229,
    "title": "Jehovah is Your majestic Name; God of the living You are",
    "lyrics": "1. Jehovah is Your majestic Name;\nGod of the living You are\nAnd now You are my God\ntoday;\nI give myself entirely to You.\n2. Jesu's Name is the pow'r of the\njust;\nLord of all true Christians You\nare;\nYou are my Redeemer and my\nKing;\nI give myself entirely to You.\n3. Holy Spirit, Lov'r of my soul;\nFaithful Friend of all who\nbelieve;\nYou are the Great Comforter to\nme;\nI give myself entirely to You.\n4. You are the Caring Father, O God\nLoving Protector You are\nYour children say all in one\naccord:\nYou are our God, our God for\ntoday\nTranslation of Kwasi Annor\nand Others' Yehowa ne Wo Din\nK1se\"\nP ANT (3), 1252"
  },
  {
    "id": "english-230",
    "language": "english",
    "languageLabel": "English",
    "number": 230,
    "title": "Jesus Christ is Wonderful Counsellor, God Almighty",
    "lyrics": "1. Jesus Christ is Wonderful\nCounsellor, God Almighty,\nEverlasting Father, Prince of\npeace;\nWe will glorify His Name\nRefrain\nBlessed is He, Blessed is He\nBlessed is our God;\nBlessed, blessed, blessed is our\nGod\n2.  Jehovah, our God is with us;\nImmanuel is in our midst;\nAnd His Kingdom spreads\nthrough the earth;\nImmanuel will not depart\nTranslation of Opoku Onyinah's\n\"Yesu Kristo y1 nwonwani\"\nP ANT (3) 1261\nChorus\nYou are holy, You are holy;\nYou are holy, O Lord Our God;\nYou are majestic, You are holy,\nYou are holy, O Lord our God\nSamuel Otu Appiah\n1.  It may not be on the mountain's\nheight,\nOr over the stormy sea;\nIt may not be at the battle's\nfront,\nMy Lord will have need of me;"
  },
  {
    "id": "english-231",
    "language": "english",
    "languageLabel": "English",
    "number": 231,
    "title": "But if by a still, small voice He calls",
    "lyrics": "1. But if by a still, small voice He\ncalls,\nTo paths that I do not know,\nI'll answer, dear Lord, with my\nhand in Thine,\nI'll go where You want me to go.\nRefrain:\nI'll go where You want me to go,\ndear Lord,\nO'er mountain, or plain, or sea;\nI'll say what You want me to say,\ndear Lord,\nI'll be what You want me to be.\n2.. Perhaps today there are loving\nwords\nWhich Jesus would have me\nspeak;\nThere may be now in the paths\nof sin,\nSome wand'rer whom I should\nseek;\nO Savior, if Thou wilt be my\nguide,\nThough dark and rugged the\nway,\nMy voice shall echo Thy\nmessage sweet,\nI'll say what You want me to say.\n3. There's surely somewhere a\nlowly place,\nIn earth's harvest fields so\nwhite,\nWhere I may labor through life's\nshort day,\nFor Jesus the Crucified;\nSo trusting my all to Thy tender\ncare,\nAnd knowing Thou lovest me,"
  },
  {
    "id": "english-232",
    "language": "english",
    "languageLabel": "English",
    "number": 232,
    "title": "I'll do Thy will with a heart sincere",
    "lyrics": "I'll do Thy will with a heart\nsincere,\nI'll be what You want me to be.\n1.  Gracious God you are\nWe bow to worship you\nGracious God you are\nWe shall ever praise you\nYour mercies shall never end\nYour grace drips down on us\nLike a well that springs up\nNever ever runs dry\n2.  Liberal provider you are\nYou do provide for all\nLiberal provider you are\nDepend we on your providence\nYour affection is ever sure\nYour goodness covers all\nLike the spring and autumn\nrains\nNever fail in season.\n3. Almighty God you are\nYour name we ever bless\nAlmighty God you are\nYour greatness we exalt\nYour favour never ends\nYour kindness never cease'\nLike a spring that will\nNever ever run dry\nTr. of Opoku Onyinah's Domfo\nNyame by Rev. Dr. S. K. Asante"
  },
  {
    "id": "english-233",
    "language": "english",
    "languageLabel": "English",
    "number": 233,
    "title": "Arise, Shine on, Move on Move on, in victory",
    "lyrics": "Arise, Shine on, Move on\nMove on, in victory\nFor the Lord your God is with\nyou\nAnd you will never ever fail\nMove on, move on\nTr. of Eunice Johnson's\n\"S`re Hyer1n\""
  },
  {
    "id": "english-234",
    "language": "english",
    "languageLabel": "English",
    "number": 234,
    "title": "We are in your hands O Lord Prepare us, give us grace and",
    "lyrics": "We are in your hands O Lord\nPrepare us, give us grace and\nhelp\nPrepare us, come fill us,\nAnd help us in every way\nWe are in your hands O Lord\nPrepare us, give us grace and help\nTranslation of Seth Asare Ofei\nBadu's\n\"Wo Nsam na Y1 w`\""
  },
  {
    "id": "english-235",
    "language": "english",
    "languageLabel": "English",
    "number": 235,
    "title": "The cloud of glory is moving Move with the cloud 2x",
    "lyrics": "The cloud of glory is moving\nMove with the cloud 2x\nLet your spirit arise and your\nmouth filled with praise\nCome, let us worship together\nAnd wherever He will be new\nheights will be achieved\nMove with the cloud 2x\n1. How lovely on the mountains\nare the feet of Him\nWho brings good news, good\nnews,\nProclaiming peace, announcing\nnews of happiness,\nOur God reigns, our God reigns.\nChorus\nOur God reigns, our God reigns,\nOur God reigns, our God reigns.\n2. You watchmen lift your voices\njoyfully as one,\nShout for your King, your King.\nSee eye to eye the Lord\nrestoring Zion;\nYour God reigns, your God\nreigns!\n3. Waste places of Jerusalem break\nforth with joy,\nWe are redeemed, redeemed.\nThe Lord has saved and\ncomforted His people:\nYour God reigns, your God\nreigns!\n4.  Ends of the earth, see the\nsalvation of your God,\nJesus is Lord, is Lord.\nBefore the nations He has bared\nHis holy arm:\nYour God reigns, your God\nreigns!"
  },
  {
    "id": "english-236",
    "language": "english",
    "languageLabel": "English",
    "number": 236,
    "title": "Revive me, O Lord Let Your Spirit lead me",
    "lyrics": "Revive me, O Lord\nLet Your Spirit lead me\nSo that I may know Your way\nSo that I will do Your will\nJustice Nana Aggrey"
  },
  {
    "id": "english-237",
    "language": "english",
    "languageLabel": "English",
    "number": 237,
    "title": "Lord God Almighty, Alpha and Omega",
    "lyrics": "Lord God Almighty, Alpha and\nOmega,\nWe love You, Lord, from the\ndepths of our hearts 2x;\nLord, You are worthy,\nTruly, You are holy,\nExceeding in grace,\nYou deserve all our praise,\nYour love is everlasting,\nWe come to You trusting\nYour Lordship, Your Kingship,\nYour power and Your might,\nYou are so awesome,\nIts good to know that You are\nmy Lord,\nI love you Lord, I really do 2x\nLord God Almighty, Alpha and\nOmega,\nWe love You, Lord, from the\ndepths of our hearts 2x;\nGina Asante\n1. As I walked through the door, I\nsensed His presence,\nAnd I knew this was the place\nwhere love abounds\nFor this is the temple, Jehovah\nGod abides here,\nAnd we are standing in His\npresence on holy ground\nRefrain\nWe are standing on holy ground\nAnd I know that there are angels\nall around\nLet us praise Jesus now\nWe are standing in His presence\nOn holy ground\n2. In His presence there is joy\nbeyond measure\nAnd at His feet peace of mind\ncan still be found\nAnd if you have a need I know\nHe has the answer\nReach out and claim it, you are\nstanding on holy ground"
  },
  {
    "id": "twi-1",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 1,
    "title": "S4 me nsa na gye m’taataa !firi s1 honam y1 mmer1",
    "lyrics": "S4 me nsa na gye m’taataa\n!firi s1 honam y1 mmer1\nWo ne wiase agyenkwa\nWo na tefefo hwehw11 wo\nEnti Kristo, kyer1 me kwan\nWo na woy1 kwankyer1fo pa"
  },
  {
    "id": "twi-2",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 2,
    "title": "O Israel Yakob Nyame $haw b1n na y1w4 mu nn1 yi",
    "lyrics": "O Israel Yakob Nyame\n$haw b1n na y1w4 mu nn1 yi\nWo ne y1n anidaso\nBra O bra na b1gye y1n\nPAN 945"
  },
  {
    "id": "twi-3",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 3,
    "title": "Kasa ma y1nte wo nne Kasa ma y1nte wo nne",
    "lyrics": "Kasa ma y1nte wo nne\nKasa ma y1nte wo nne\nTetefo tee wo nne no wo sare so\nKasa ma y1nte wo nn1\nPB Appiah-Adu P AN 946"
  },
  {
    "id": "twi-4",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 4,
    "title": "Migyina Calvary bep4 so Na mehw1 de1 Onyame ay1",
    "lyrics": "Migyina Calvary bep4 so\nNa mehw1 de1 Onyame ay1\nNa mehw1 de1 Onyame ay1\nNa mehw1 de1 Onyame ay1\nMigyina Calvary bep4 no so\nNa mehw1 de1 Onyame ay1"
  },
  {
    "id": "twi-5",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 5,
    "title": "Gya me k4 bep4 no atifi Na me ne wo nya ay4nkofa",
    "lyrics": "Gya me k4 bep4 no atifi\nNa me ne wo nya ay4nkofa\nW4 hann mu, mehu asuten\nWo mogya n’ate me bo"
  },
  {
    "id": "twi-6",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 6,
    "title": "Awurade d4m so Safohene Y1w4 wo a na y1w4 ade nyinaa",
    "lyrics": "Awurade d4m so Safohene\nY1w4 wo a na y1w4 ade nyinaa\nB1ko ma y1n nn1 nso bio\nEfiri s1 4ko yi y1 wo ko"
  },
  {
    "id": "twi-7",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 7,
    "title": "Tete mmer1 mu gya no 1red1w Tete mmer1 mu gya no 1red1w",
    "lyrics": "Tete mmer1 mu gya no 1red1w\nTete mmer1 mu gya no 1red1w\n1red1w, 1red1w\n!repam sum mu nnwuma\nnyinaa’ra\n1red1w, 1red1w\n!repam sum mu nnwuma\nnyinaa’ra\nP AN 383, Agnes Sarfo"
  },
  {
    "id": "twi-8",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 8,
    "title": "Honhom kronkron me kra d4fo Ma mennhu w’akwan mu yiye",
    "lyrics": "Honhom kronkron me kra d4fo\nMa mennhu w’akwan mu yiye\nS1 4honam rekata me so a\nGye m’taataa na fa me k4 oo\nWiase resakyera m’adwen a\nGye m’taataa, na fa me k4 oo"
  },
  {
    "id": "twi-9",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 9,
    "title": "AHOTEWFO munhyira Awurade",
    "lyrics": "AHOTEWFO munhyira\nAwurade\nMomm4 ne din nkyer1 no\nadwuma;\nN’4de N’adwhye mogya at4 y1n\nmogya a 1som bo no ohwie qui\nmaa y1n\n‘Ma y1afata Ne nky1n h4\nEnti momfa nsankudwom ne\nahokeka\nNhy1 Ne din anuoyam (2)\nP AN 56, Christisna Obu"
  },
  {
    "id": "twi-10",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 10,
    "title": "B4 bra me kra do B4 bra me kra do",
    "lyrics": "B4 bra me kra do\nB4 bra me kra do\nNyame no sumsum\nB4 bra me kra do\nMahomgye dzi yi mu\nBere a metse wo nan ase yi\nNyame no Sunsum\nB4 bra me kra wo"
  },
  {
    "id": "twi-11",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 11,
    "title": "Merehwehw1 wo Merehwehw1 wo",
    "lyrics": "Merehwehw1 wo\nMerehwehw1 wo\nW4 Asennua n’so\nM’Agyenkwa (2)\nS1nea wo d4 me,\nMe nso med4 wo\nW4 asennua n’so\nM’Agyenkwa\nP AN 954"
  },
  {
    "id": "twi-12",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 12,
    "title": "Wo nnwuma nyinaa da wo ase",
    "lyrics": "1. Wo nnwuma nyinaa da wo\nase\nWo a wote sorosoro\nGyidifo b1bom aka s1\nWo ne Otumfo Nyankop4n\n2. Obi nni wakyi nni w’anim\nWo w4 h4 nnera nn1 ne daa\nMa wiase aman nyinaa\nnhu s1\nWo ne Otumfo Nyankop4n\n3. D1n nti na atumfo s4re tia\nAwurade Kristo kronkron no\nAwurade ma w4n nyinaa\nnhu s1\nWo ne Otumfo Nyankop4n\n4. Wo ne Otumfo Nyankop4n\nTumi bi renntumi ntia wo\nMogya adasefo nim s1\nWo ne Otumfo Nyankop4n\n5. Wo ne Otumfo Nyankop4n\nWo na wob44 ade nyinaa\nWo nnwuma nyinaa kyer1 s1\nWo ne Otumfo Nyankop4n\nApostlic Twi NNwom 50"
  },
  {
    "id": "twi-13",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 13,
    "title": "M1d4 wo O Kristo M1d4 wo daa",
    "lyrics": "M1d4 wo O Kristo\nM1d4 wo daa\nTie me nankroma anim\nmpaeb4\nNea mesr1 wo ne s1\nM1d4 wo Kristo no\nM1d4 wo daa, M1d4 wo daa."
  },
  {
    "id": "twi-14",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 14,
    "title": "$y1 anidaso4 a 4nhy1 oniwuo $y1 anidaso4 a 4nhy1 oniwuo",
    "lyrics": "$y1 anidaso4 a 4nhy1 oniwuo\n$y1 anidaso4 a 4nhy1 oniwuo\nS1 wode wo ho to no so yie a\nNa wogye ne b4hye ns1m no di\na\nWo b1hu Nanuonyam s1nea 1te\n$y1 anidaso4 a 4nhy1 oniwuo"
  },
  {
    "id": "twi-15",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 15,
    "title": "Agye me tontom wo De m’akwan nyinaa hy1 wo",
    "lyrics": "1. Agye me tontom wo\nDe m’akwan nyinaa hy1 wo\nnsa\nM1d4 wo daa\n2. $ba me tontom wo\nDe m’akwan nyinaa hy1\nwo nsa\nM1d4 wo daa\n3. Honhom me tontom wo\nDe m’akwan nyinaa hy1\nwo nsa\nM1d4 wo daa\nP AN 188"
  },
  {
    "id": "twi-16",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 16,
    "title": "Bue maso ma mente W’as1m",
    "lyrics": "Bue maso ma mente\nW’as1m\nNa mente ase yiye.\nBue m’ano na menka W’as1m\nMa menka nea woahy1 me no\nNa s1 wobue maniwa\nMa mehu wo mmara mu\nanwanwade\nEnti boa me ma mensom wo yie\nW4 wo fr1 adwuma yi mu\nPAN 1033 Eunice Johnson"
  },
  {
    "id": "twi-17",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 17,
    "title": "Me honhom, kra ne me honam Jesus mede rebr1 wo",
    "lyrics": "Me honhom, kra ne me honam\nJesus mede rebr1 wo\nAf4reb4de a 1ho te kronn\n!y1 wo de daa nyinaa\nMade nyinaa gu pata no so\nMeretw1n ma ogya no aba\nMeretw1n, Meretw1n,\nMeretw1n\nMeretw1n ma ogya no aba"
  },
  {
    "id": "twi-18",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 18,
    "title": "Yesu nko na me ne no tu kwan yi",
    "lyrics": "1. Yesu nko na me ne no tu\nkwan yi\nMe ne no di ahy1mfiri daa\nYesu nko na 4kyer1\nm’kwan pa so\nNe mu na menya nhyira pa:\n2. Kwan mu mmep4 so 1ne\nabon mu\nSare so ne po so mmaa\nnyinaa\nOkita me nsa ma menam\ndwoodwoo\n$de me rek4 soro fi pa:\n3. Ade sa a mek4da, 4w1n me\nNa mes4re a m’adamfo ni\nS1 anka mefom a, gyigye me\nNantebrem 4san b1hy1 me den:\nPresby Twi Dwom 431"
  },
  {
    "id": "twi-19",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 19,
    "title": "Yesu ma memfa me ho Nto wo so yiye daa nyinaa",
    "lyrics": "Yesu ma memfa me ho\nNto wo so yiye daa nyinaa\nNa mintim w’adwuma yi mu\nNa mentena w’apirakuro no mu"
  },
  {
    "id": "twi-20",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 20,
    "title": "NYAME a Woy1 4baatan pa Wo mma resu fr1 Wo nn1",
    "lyrics": "1. NYAME a Woy1 4baatan pa\nWo mma resu fr1 Wo nn1\n$domfo Nyame a Wodom y1n,\nWo mma resu fr1 Wo nn1\nHu y1n mm4b4, tie y1n\nsufr1\nTie y1n mpaeb4 adekyee yi\n2. Adom Nyame a Woahy11\ny1n b4\nWo mma retw1n wo b4hy1\nAdom Honhom Kronkron\nb4hy1 n’\nWo mma retw1n Wo nn1\nHwie gu y1n so, b4 y1n\nasu bio\nTena y1n komam adekyee yi\n3. $dom Honhom Nyame\naky1de\nNyame Baasa koro tumfo,\nFa Kristo dom mu nnepa no\nHyehy1 W’asafo ma\nW4 abrab4 mu, y1n as1nka\nmu\nW4 nyansa tum’ nyikyer1\nmu daa"
  },
  {
    "id": "twi-21",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 21,
    "title": "NEA 4ma sukooko fifir Nea 4ma wim nnomaa nso",
    "lyrics": "1. NEA 4ma sukooko fifir\nNea 4ma wim nnomaa nso\ndidi\n$y1 4d4 4b1n wo ara\nAwurade b1hw1 ne nyinaa\n2. Nea tum s1 4ma nkwa\nfofor\nNea ne tenabea w4 sor’sor\n$b1ma w’nea 1hia w’biara\nAwurade b1hw1 ne nyinaa\n3. Akwantu m’1ka wo nko a\nS1 4b4fo bi gya w’h4 k4 a\n$d4fo pa no ne wo b1tena\nAwurade b1hw1 ne nyinaa\nPAN 51"
  },
  {
    "id": "twi-22",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 22,
    "title": "Asafo Yehowa Ab4de so Wura",
    "lyrics": "Asafo Yehowa\nAb4de so Wura\nWo din y1 k1se y1b1yi W’ay1\nY1b1hy1 wo din anuonyam\nPAN 252"
  },
  {
    "id": "twi-23",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 23,
    "title": "Wo nsa ano adwuma trontrom wo",
    "lyrics": "Wo nsa ano adwuma trontrom\nwo\n$soro ab4fo s4re wo\nW’ahotewfo, y1to dwom s1\nNhyira nka Wo din nhyira nka\nWo din."
  },
  {
    "id": "twi-24",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 24,
    "title": "$ky1n w4n nyinaa $ky1n w4n nyinaa",
    "lyrics": "$ky1n w4n nyinaa\n$ky1n w4n nyinaa\nJesus a wokum no n’\n$ky1n w4n nyinaa\nYetwa hwe Ne nan ase s4re no\nNyame ama No so\nNa 4ky1n w4n nyinaa\nPAN 268"
  },
  {
    "id": "twi-25",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 25,
    "title": "Momma y1nkamfo Yehowa Na ne mu ana nkwagye w4",
    "lyrics": "Momma y1nkamfo Yehowa\nNa ne mu ana nkwagye w4;\n!s1 s1 y1kotow no na y1da\nN’ase\nNa ne mu na nkwage w4."
  },
  {
    "id": "twi-26",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 26,
    "title": "!bere a merekyinkyin 4bra sare so",
    "lyrics": "!bere a merekyinkyin 4bra\nsare so\nNa minnya baabi memfa,\nNa metee m’Agyenkwa No nne\nNa 4ka kyer11 me s1 memmra\nne nky1n\nMinim Ne din, m’Agyenkwa no\nNa 4maa m’akoma dii ahurusi\n!bere biara 4ka kyer1 m’s1\nMinyi Awurade ay1\nMagye no adi."
  },
  {
    "id": "twi-27",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 27,
    "title": "Y1de akoma koro yi N’ay1 Y1de akoma koro da N’ase",
    "lyrics": "Y1de akoma koro yi N’ay1\nY1de akoma koro da N’ase\nMunyi N’ay1, monna N’ase\nAkoma koro yi Nyame ay1\nPAN 106"
  },
  {
    "id": "twi-28",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 28,
    "title": "Monkeka s1 Yesu ye Monkeka no an4pa ne",
    "lyrics": "Monkeka s1 Yesu ye\nMonkeka no an4pa ne\nanwummer1;\n$y1 mm4bor4hunufo,\n$y1 kasamafo\nMonkeka s1 Yesu ye.\nPAN 112"
  },
  {
    "id": "twi-29",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 29,
    "title": "AMEN, Amen, Nhyira ne anuonyam",
    "lyrics": "AMEN, Amen,\nNhyira ne anuonyam\nNe nyansa ne aseda,\nNe nidi ne tumi\nNe ah4dden y1 y1n Nyankop4n\ndea daa. Amen"
  },
  {
    "id": "twi-30",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 30,
    "title": "Meyi Jesus m’akyer1 Mede Jesus b1ka as1m",
    "lyrics": "Meyi Jesus m’akyer1\nMede Jesus b1ka as1m\nMede Jesus b1hy1 makoma mu\nNa wakyer1kyer1 me daa\nHalleluya y1b1ma No so\nHalleluya y1b1yi N’ay1\nHalleluya! Halleluya!\nHalleluya! Halleluya!\nHalleluya y1b1ma No so"
  },
  {
    "id": "twi-31",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 31,
    "title": "M1y1 d1n na makamfo Wo m’Agya e?",
    "lyrics": "M1y1 d1n na makamfo Wo\nm’Agya e?\nW4 ade k1se a W’ay1 ama me\nM1y1 d1n na makamfo Wo\nm’Agya e?\nW4 ade k1se a W’ay1 ama me\nM1som Wo, m1som Wo\nMesom Wo, daa nyinaa\nM1y1 d1n na makamfo Wo\nm’agya e?\nW4 ade k1se a Woay1 ama me."
  },
  {
    "id": "twi-32",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 32,
    "title": "Gu me kanea mu ngo ma menhyer1n daa:",
    "lyrics": "Gu me kanea mu ngo ma\nmenhyer1n daa:\nGu me kanea mu ngo mesr1 W’\nGu me kanea mu ngo na\nmenn1w daa\nMa menn1w kosi s1 ade b1kye\nTo Hosiana! To Hosiana!\nTo Hosiana ma ahemfo w4n\nHene\nTo Hosiana! To Hosiana!\nTo Hosiana ma $hene\nP AN 350"
  },
  {
    "id": "twi-33",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 33,
    "title": "MEREPEM so k4; Jesus, merepem so k4",
    "lyrics": "MEREPEM so k4;\nJesus, merepem so k4\nS1 me nkur4fo y1 me d1n ara a\nmerennsan\nMe ne w4n a w4apo wiase b1k4\nMerepem so k4, me de,\nmerepem so k4.\nP AN 363"
  },
  {
    "id": "twi-34",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 34,
    "title": "Y1n tete botan ne Wo, Yehowa; Y1n tete botan ne Wo, Yehowa",
    "lyrics": "Y1n tete botan ne Wo, Yehowa;\nY1n tete botan ne Wo, Yehowa;\nMa aman nyinaa nhu s1\nW’aho4den mu na yedi d1w (2)\nPAN 371"
  },
  {
    "id": "twi-35",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 35,
    "title": "MEDE 4hyewb4 gya ne Jesus b1nantew",
    "lyrics": "MEDE 4hyewb4 gya ne\nJesus b1nantew;\nMede 4hyewb4 gya ne\nJesus b1nantew.\nMede 4hyewb4 gya ne\nJesus b1nantew 1nn1 ne daa\nnyinaa\nP AN 370"
  },
  {
    "id": "twi-36",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 36,
    "title": "Ma y1n nsu no bi; Ma y1n nsu",
    "lyrics": "Ma y1n nsu no bi;\nMa y1n nsu\nMa y1n 4hyewb4 nsu\nY1hia nsu no bi, y1hia nsu\nMa y1n 4hyewb4 nsu\nB1sa yare na benyan awufo\nMa y1n 4hywob4 nsu\nY1hia nsu no bi y1hia nsu\nMa y1n 4hyewb4 nsu\nPAN 375"
  },
  {
    "id": "twi-37",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 37,
    "title": "AS$RE yi ne fapem ne Jesus As4re yi ne fapem ne Jesus",
    "lyrics": "AS$RE yi ne fapem ne Jesus\nAs4re yi ne fapem ne Jesus\nAs4re yi ne fapem ne Jesus\n$kae s1 “Mesi m’as4re”"
  },
  {
    "id": "twi-38",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 38,
    "title": "Merensesa me Nyame da: Merensesa me Nyame da",
    "lyrics": "Merensesa me Nyame da:\nMerensesa me Nyame da.\nNs4hw1 biara a 1b1ba me so\nMerensesa me Nyame da (2)"
  },
  {
    "id": "twi-39",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 39,
    "title": "Momma yenni y1n Nyankop4n akyi",
    "lyrics": "Momma yenni y1n Nyankop4n\nakyi;\nMomma y1mfa y1n ho nto No so\nNa 4no na $boro ade nyinaa so;\nNa 4no na $b1y1\nNa 4no na $b1y1\nNa 4no na $b1y1\nP AN 408"
  },
  {
    "id": "twi-40",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 40,
    "title": "S1 w4amfi nsu ne Honhom mu anwo obi a",
    "lyrics": "S1 w4amfi nsu ne\nHonhom mu anwo obi a;\n$rennya ahenni no\nEnti mo a w4awo mo foforo\nMony1 ahw1 yiye\nMe Nyame, mereka “kyer1 mo s1\n$tamfo ani bere mo\nW4b1to mo din biara;\nW4b1gu mo ho fi;\nW4besum mo ho afiri\nW4p1 s1 mo mu hwete\nW4 Me, Yesu, ho tan nti,\nMonnsuro. PAN 410"
  },
  {
    "id": "twi-41",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 41,
    "title": "M1k4 bep4w no so M1k4 bep4w no so",
    "lyrics": "M1k4 bep4w no so\nM1k4 bep4w no so\nS1 4b4n’ ne ne d4m twa\nMe ho hyia a,\nM1k4 Awurade ne bep4w no so"
  },
  {
    "id": "twi-42",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 42,
    "title": "SEREW, me nua, serew; Kaans1 nna no ware mpo a",
    "lyrics": "SEREW, me nua, serew;\nKaans1 nna no ware mpo a\nSerew, me nua, serew;\nHy1 w’akoma den\nNna a y1w4 mu yi emu y1 sum;\nMinim y4nko a $besie w’yiye\nN’$b1gye wo nkwa abere nyinaa\nNa wob1ser1w, aserew.\nP AN 424"
  },
  {
    "id": "twi-43",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 43,
    "title": "$y1 y4nko nokwafo Ma me, ma me",
    "lyrics": "$y1 y4nko nokwafo\nMa me, ma me\n$te saa de k4 awiei\n$nnsakra da\nNa s1 4bra asor4kye reb4 a\n$y1 me kra wer1kyekyefo\n$y1 y4nko nokwafo\nMa me, ma me.\nPAN 430"
  },
  {
    "id": "twi-44",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 44,
    "title": "S1 4ko no mu y1 den d1n ara a Nkonim Hene ne y1n frankaa (2)",
    "lyrics": "S1 4ko no mu y1 den d1n ara a\nNkonim Hene ne y1n frankaa (2)\nY1rek4 y1n anim, y1rek4 y1n\nanim\nY1rennsan y1n akyi ara da\nY1rek4 y1n anim, y1rek4 y1n\nanim\nNkonim Hene ne y1n frankaa\nP AN 442"
  },
  {
    "id": "twi-45",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 45,
    "title": "Okristoni, ma w’ani nna Onyame so (2)",
    "lyrics": "Okristoni, ma w’ani nna\nOnyame so (2)\nHw1 No ara, gyae nk4mm4di\nEfis1, wim ny1 No nsakra na;\nOnyankop4n b1hw1 wo so ma asi\nwo yiye\nPAN 445"
  },
  {
    "id": "twi-46",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 46,
    "title": "KO GYIDI ko pa; Tu 4d4 mmirika",
    "lyrics": "KO GYIDI ko pa;\nTu 4d4 mmirika\nAwiei n’4b1se wo s1: “Mmo”\nAkoa pa nokwafo, woadi\nnkonim\nAbaawa nokwafo, woadi\nnkonim\nPAN 453"
  },
  {
    "id": "twi-47",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 47,
    "title": "Mew4 Nyame Otumfo w4 m’anim",
    "lyrics": "Mew4 Nyame Otumfo w4\nm’anim\nNokware Nyame\n$kyer1 me nsa akodi daa\nnyinaa\nM’atamfo so\n$ka me ho yi, minsuro biribi\nNyame Tumfo meyi N’ay1 daa\ndaa\nP AN 463\nWords by M.K. Yeboah"
  },
  {
    "id": "twi-48",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 48,
    "title": "MANYA y4nko Jesus mu; $y1 m’ade nyinaa",
    "lyrics": "MANYA y4nko Jesus mu;\n$y1 m’ade nyinaa;\n$se me s1 memfa me haw\nnyinaa ngu No so\n$y1 mm4nsa m’asukooko\nan4pawi hy1nhy1n\n$y1 y4nko, y4nko ma me kra,\n$y1 m’akyekyewer1\n$y1 me kyitaani\n$se me s1 memfa me haw\nnyinaa ngu no so\n$y1 mm4nsa m’asukooko,\nan4pawi hy1nhy1n\n$y1 y4nko, y4nko ma me kra"
  },
  {
    "id": "twi-49",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 49,
    "title": "NEA Owui w4 Calvary sunsum no",
    "lyrics": "NEA Owui w4 Calvary sunsum\nno\nRey1 anwanwa dwuma\nRetu mmonsam, resa nyarewa\nSiw gyata ano, redum gya tum\nReka ananafo mpasua nyinaa\ngu\nNea Owui w4 Calvary sunsum\nno\nRey1 anwanwa dwuma\nPAN 468\nEunice Addison"
  },
  {
    "id": "twi-50",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 50,
    "title": "Fa w’akwan hy1 Yehowa nsa",
    "lyrics": "Fa w’akwan hy1\nYehowa nsa\nNa fa wo ho to no so\nNa $no na 4b1y1\nNa $no na 4b1y1\nP AN 475"
  },
  {
    "id": "twi-51",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 51,
    "title": "Monhw1 nnomaa a wokyin w4 wim",
    "lyrics": "Monhw1 nnomaa a wokyin w4\nwim\nW4nn4, w4mpam, w4mmu nhy1\nasan\nAgya Onyame, $ky1 a 1so w4n so\nNa $ma w4n daa daa aduan"
  },
  {
    "id": "twi-52",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 52,
    "title": "WIASE amane d44so, Awurade adi so nkonim",
    "lyrics": "1. WIASE amane d44so,\nAwurade adi so nkonim\nW4n a w4tw1n Awurade daa,\nWobenya Ne mu asomdwoe\nWobenya Ne mu asomdwoe\nChorus\nW4benya Ne mu asomdwoe\nW4benya Ne mu asomdwoe\nW4n a w4tw1n Awurade daa\nW4benya Ne mu asomdwoe\n2. Sion babea di ahurusi\nYesu mogya adi nkonim,\nAwer1how nyinaa b1sa;\nAnigye b1ba ama wo.\nP AN 476, Rose Badu"
  },
  {
    "id": "twi-53",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 53,
    "title": "Awurade ne me hw1fo, Hwee rennhia me (2)",
    "lyrics": "Awurade ne me hw1fo,\nHwee rennhia me (2)\n$ma me da wura fr4mfr4m\nadidibea (2)\n$gya me k4 nsu a 1ho dwo ho\n$ma me fa kwan trenee so\nNe din no nti, Ne din no nti\nNe din no nti, Ne din no nti\nP AN 481"
  },
  {
    "id": "twi-54",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 54,
    "title": "$w4 mu s1 $kamafo4; $w4 mu s1 $fotufo4",
    "lyrics": "$w4 mu s1 $kamafo4;\n$w4 mu s1 $fotufo4;\nEnti 1b1y1 yiye, me nua, na\nmma w’aba mu mmu o! (2)\nWaise yi m’bagyabagya, 1to\nbetwa\nJesus b1hw1 ma woaduru fie s4nn\n$w4 mu s1 $kamafo4;\n$w4 mu s1 $fotufo4;\nEnti 1b1y1 yiye, me nua,\nna mma w’aba mu mmu o!\nP AN 484, P .B. Appiah-Adu"
  },
  {
    "id": "twi-55",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 55,
    "title": "NNSURO na gye Me di Me na meso nkwagye nam",
    "lyrics": "NNSURO na gye Me di\nMe na meso nkwagye nam\nM1ma wo nkwa, M1ma wo nkwa\nM1ma wo nkwa, na woadi yiye;\nM1ma wo nkwa, M1ma wo\nnkwa,\nM1ma wo nkwa, na woadi ‘nim\nP AN 510\nP .B. Appiah-Adu"
  },
  {
    "id": "twi-56",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 56,
    "title": "EMMANUEL Nyame ne y1n w4 h4",
    "lyrics": "EMMANUEL Nyame ne y1n\nw4 h4\nEmmanuel Nyame ne y1n w4 h4\n$y1 ahohia m’boafo pa a\nY1anya no nhunui\n$ne y1n w4 h4 nn1 k4si wiase awie1\nEmmanuel Nyame ne y1n w4 h4\nEmmanuel Nyame ne y1n w4 h4\nP AN 536, Eunice Johnson"
  },
  {
    "id": "twi-57",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 57,
    "title": "Yehowa me botantim M’abank1se, me gyefo",
    "lyrics": "Yehowa me botantim\nM’abank1se, me gyefo,\nMe ky1m, me guank4bea,\nMe wura, meda W’ase daa\nP AN 558, P .B. Appiah-Adu"
  },
  {
    "id": "twi-58",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 58,
    "title": "Me ne No bedi d1w daa W4 soro ahemfie",
    "lyrics": "Me ne No bedi d1w daa\nW4 soro ahemfie\nS1 mewie m’adwuma nkonim\nmu a\nMe ne No bedi d1w daa\nP AN 564, P .B. Appiah-Adu"
  },
  {
    "id": "twi-59",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 59,
    "title": "Me br1 reny1 kwa, Me br1 reny1 kwa",
    "lyrics": "Me br1 reny1 kwa,\nMe br1 reny1 kwa\nS1 mede Nyamesom pa\nTena ase me nkwa yi mu a\nMe br1 reny1 kwa\nS1 mede Nyamesom pa\nTena ase m’abrab4 yi mu a\nMe br1 reny1 kwa\nP AN 566, P .B. Appiah-Adu"
  },
  {
    "id": "twi-60",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 60,
    "title": "MEY! ONYAME, mey1 Onyame",
    "lyrics": "MEY! ONYAME, mey1\nOnyame,\nMey1 Onyame a mensakra da (2)\nmensakra da\nMey1 Onyame a mensakra da\nMey1 Onyame a mensakra da (2)\nmensakra da\nP AN 577 Translation by R.\nSarpong Asomani"
  },
  {
    "id": "twi-61",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 61,
    "title": "Y!AS!E ne nwuma, Onni hwee ara ka",
    "lyrics": "Y!AS!E ne nwuma,\nOnni hwee ara ka\nW’ama y1n tumi s1 y1ns1e ne\nnnwuma\nP AN 580, Eunice Johnson"
  },
  {
    "id": "twi-62",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 62,
    "title": "$KY!N ade nyinaa M’Agyenkwa $ky1n ade nyinaa",
    "lyrics": "$KY!N ade nyinaa\nM’Agyenkwa $ky1n ade nyinaa\n$ky1n ade nyinaa\n$ky1n ade nyinaa\nW’ak’r4n No w4 soro h4\nYetwa hwe N’anim\nJesus y1n Agyenkwa\nnwanwani,\n$ky1n ade nyinaa,\nPAN 587"
  },
  {
    "id": "twi-63",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 63,
    "title": "MINIM s1 mogya no, Minim s1 mogya no",
    "lyrics": "1. MINIM s1 mogya no,\nMinim s1 mogya no\nMinim s1 mogya no di maa me\nDa bi meyerae,\nOwui w4 dua no so\nMinim s1 mogya no di\nmaa me\n2 $too Ne nsa gyee me,\n$too Ne nsa gyee me\n$too Ne nsa gyee me gyee me\nDa bi meyerae,\nOwui w4 dua no so\nMinim s1 mogya no di maa\nme\n3 Mihuu N’w4 dua no so;\nMihuu N’w4 dua no so;\nMihuu N’w4 dua no so; no so\nDa bi meyerae,\nOwui w4 dua no so\nMinim s1 mogya no di maa\nme\n4 Mogya no ka maa me;\nMogya no ka maa me;\nMogya no ka maa me;\nmaa me.\nDa bi meyerae,\nOwui w4 dua no so\nMinim s1 mogya no di\nmaa me\nP AN 613"
  },
  {
    "id": "twi-64",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 64,
    "title": "$fr1 a w’afr1 y1n no y1 $soro fr1 Y1 ne 4honam ne mogya",
    "lyrics": "$fr1 a w’afr1 y1n no y1 $soro fr1\nY1 ne 4honam ne mogya\nantu agyina\n$fr1 a w’afr1 y1n no y1\n$soro fr1\n$fr1 a w’afr1 y1n no y1\n$soro fr1\nP AN 624"
  },
  {
    "id": "twi-65",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 65,
    "title": "1 M’AKOMA ahy1 ma, ahy1 ma abu so",
    "lyrics": "1 M’AKOMA ahy1 ma, ahy1\nma abu so\nM’akoma ahy1 ma,\nM’ak4t4 ahosan s’r4kye no mu\nAfei metwere Jesus\nNea 4w4 tumi s1 4gye nkwa\nM’akoma ahy1 ma ahy1 ma\nabu so\n2. Midi d1w m’akomam:\nM’akomam, m’akomam\nMidi d1w m’akomam\nYesu Kristo mogya\nn’aguare me\nAtew me ho ma may1\nOnyankop4n ba\nMidi d1w m’akomam;\nm’akomam, ’akomam\n3. Anigye ahy1 me ma;\nAhy1 me ma, abu so\nAnigye ahy1 me ma;\nAgyenkwa Yesu ahy1\nme b4 s1:\n$beba ab1fa me ak4tena\nNe nhy1n daa\nAnigye ahy1 me ma;\nAhy1 me ma, abu so.\nP AN 632 RH 47\nVerse 2&3 by S.A.K. Karikari"
  },
  {
    "id": "twi-66",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 66,
    "title": "ME HYE HAMA afa nea eye ama me",
    "lyrics": "ME HYE HAMA afa nea eye\nama me\nAp1gyade no y1 me f1\nBer1 a w4kyeky11 4soro nnepa no\nMe de me nsa kaa Yesu\nHallelu Ya! Hallelu Ya!\nMe hye hama afa nea eye\nHallelu Ya! Hallelu Ya!\nMe hye hama afa nea eye\nP AN 669, Eunice Johnson"
  },
  {
    "id": "twi-67",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 67,
    "title": "!Y! YESU n’adom ara kwa N’ama mete s1nea mete yi",
    "lyrics": "1. !Y! YESU n’adom ara kwa\nN’ama mete s1nea mete yi\n$de Ne Mogya n’at4 me\nama manya me fawohodi.\n2. !y1 Yesu mpatawu no,\nN’aka me ne Nyame abom\nManya N’abagye mu bembu\n1ne N’adom ngosra mu dom\n3. !y1 Yesu N’as4re mu tum’\nN’ama me ne Nobom te ase;\nNe nkonimdi tumi no mu\nN’ama maky1n nkonimdifo.\n4. !y1 Yesu N’adom mu nkwa\nN’1resiesie me daa nyinaa\nNa madu Ne p1y1 ‘mudi4m’\nNa mas1 Ne daapem ahenni\n5. Awurade Yesu ne me nkwa;\nMete ase a, mete ma No.\nMiwu nso a, mey1 Ne de\nM1s1 N’anuonyam Nyame su\nP AN 670, M.K. Yeboah"
  },
  {
    "id": "twi-68",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 68,
    "title": "GYIDI k1se ho b4hy1 no $hw1 Nyame nkutoo",
    "lyrics": "GYIDI k1se ho b4hy1 no\n$hw1 Nyame nkutoo\n$serew ade a 1’ntumi ny1\nN’4te1m s1: “1b1y1 yie”\nN’4te1m s1: “1b1y1 yie”\nN’4te1m s1: “1b1y1 yie”\n$serew ade a 1’ntumi ny1\nN’4te1m s1: “1b1y1 yie”"
  },
  {
    "id": "twi-69",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 69,
    "title": "MAHY! b4 s1 medi Yesu akyi daa nyinaa!",
    "lyrics": "MAHY! b4 s1 medi\nYesu akyi daa nyinaa!\nAwurade e, mey1 Wo somfo\nS1 m’akwan mu ns4e ama\nmay1 mmer1w a\nAwurade e, mey1 Wo somfo\nMey1 Wo somfo awer1how da m’\nMey1 wo somfo anigye da m’\nMey1 wo somfo w4 daakye nso;\nAwurade e, mey1 wo somfo\nPAN 818"
  },
  {
    "id": "twi-70",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 70,
    "title": "MEY! honam ne mogya na Wofr11 me s1",
    "lyrics": "MEY! honam ne mogya na\nWofr11 me s1\nMemmra mm1y1 W’adwuma (2)\nHy1 me ma; hy1 me ma\nNa motumi ay1 W’adwuma\nMey1 honam ne mogya na\nWofr11 me s1\nMemmra mm1y1 W’adwuma.\nPAN 834"
  },
  {
    "id": "twi-71",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 71,
    "title": "M!Y! nea m1tumi Mahy1 W’anuonyam",
    "lyrics": "1. M!Y! nea m1tumi\nMahy1 W’anuonyam\nM’asetra akwantu yi m’\nM1to dwom, maka W’as1m\nAwurade\n‘Ma ‘binom ahu Wo d4\nChorus\nM1y1 AWurade pa, m1y1\nMedi me b4hy1 no so\nNkwa ne owu m’ medi wo\nnokware\nAwurade eyi na m1y1\n2. M1y1 W’adwuma nokware\nm’Awurade\nDe atua me kaw no bi\nW’ad4e a woayi akyer1 me\nno nti\nDe atwe w4n a w4ayera\n3. M’ani b1gye Wo som ho,\nAwurade,\nKosi s1 wob1fr1 me\nNa me ne hann soro 4b4fo no\nB1yi wo din ay1 daa.\nP AN 840, PH 311"
  },
  {
    "id": "twi-72",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 72,
    "title": "ME NE Nyame b1k4 awie1 Me ne Nyame b1k4 awie1",
    "lyrics": "ME NE Nyame b1k4 awie1\nMe ne Nyame b1k4 awie1\nMe ne Nyame b1k4 awie1\nMe ne Nyame b1k4 awie1\nPAN 857,\nR. Sarpong Asomani"
  },
  {
    "id": "twi-73",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 73,
    "title": "OTWA adwuma no so Na adwumay1fo no sua ampa",
    "lyrics": "OTWA adwuma no so\nNa adwumay1fo no sua ampa\nMa w4mmu wo bi,\nMa w4mfr1 wo w4\nNe twa adwuma no mu\nPAN 885, P.B. Appia-Adu"
  },
  {
    "id": "twi-74",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 74,
    "title": "MEDI Wo din ho adanse akyer1 aman",
    "lyrics": "MEDI Wo din ho adanse\nakyer1 aman\nJesus, $y1 ade1 yiye\nM1ka W’anwanwa adwumaW’ay1\nJesus, $y1 ade1 yiye\nMafi d4te p4t44 no mu\nMafi ‘sum tumi no ase\nMaba hann k1se a 1y1 nwonwa\nno mu\nJesus, $y1 ade1 yiye.\nPAN 868"
  },
  {
    "id": "twi-75",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 75,
    "title": "M’AGYENKWA Yesu ame me gyinabea foforo",
    "lyrics": "M’AGYENKWA Yesu ame me\ngyinabea foforo\nGyinabea a 1kor4n, gyinabea a\n1tr1w\n!s1 me s1 mehw1 me kwan so\nyiye\nNa me gyinabea no annyera\nP AN 886 P .B. Appia-Adu"
  },
  {
    "id": "twi-76",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 76,
    "title": "YESU N’ayefore ne me, $resiesie me ama 4man k1se bi",
    "lyrics": "YESU N’ayefore ne me,\n$resiesie me ama 4man k1se bi\na 1reba (x2)\nAyeforokunu n’b1ba ab1fa\nN’ayeforo\nN4de no ak4 ne daa ahom’gye m’\nWo nokwar’di, w’ahobr1ase\nW’ahokeka kronkron ne\nw’ahyehy1de."
  },
  {
    "id": "twi-77",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 77,
    "title": "PENTKOSTE da no mu no Nyame tumi no sian’ bae",
    "lyrics": "1. PENTKOSTE da no mu no\nNyame tumi no sian’ bae\nNa da a w4tw1n no dui no\nW4nyaa Honhom Kronkron no\nChorus\nMa y1n Wo tumi no nn1\nMa y1n Wo tumi no nn1\nMa y1n Wo tumi no nn1\nNa 1mm1b4 obiara asu\n2. ‘Gya t1kr1ma sisii w4n so\nNa w4de tumi kaa as1m\nNnipa dodow tiee w4n as1m\nNa w4dan baa Nyame nky1n\n3. Y1n nyinaa de nokoro ka\ns1\nY1retw1n Honhom kronkron\nAwurade, kae wo b4hy1 no a\n!w4 W’as1m no mu\nP AN 925"
  },
  {
    "id": "twi-78",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 78,
    "title": "SRA me, sra me, sra me Sra me ngo foforo",
    "lyrics": "SRA me, sra me, sra me\nSra me ngo foforo\nNa matumi ay1 W’adwuma\nSRA me, sra me, sra me\nSra me ngo foforo\nNa matumi ahy1 W’anuonyam\nW’adwuma no b1y1 nkonimdi\nara\nNa matumi ama Wo din no so\nEnti sra me, sra me, sra me.\nSra me ngo foforo\nNa matumi ahy1 W’anuonyam\nP AN 928, R. Kissiedu"
  },
  {
    "id": "twi-79",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 79,
    "title": "HWIE ma 1ny1 ma; Hwie ma 1mmu so",
    "lyrics": "HWIE ma 1ny1 ma;\nHwie ma 1mmu so;\nAdom nkwa nsu na yehia nn1\nAdom nkwa nsu na yehia nn1\nP AN 966, P .B. Appia-Adu"
  },
  {
    "id": "twi-80",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 80,
    "title": "S1 wob1som Nyame yiye a, Ky1 w4 mpaeb4 mu",
    "lyrics": "1. S1 wob1som Nyame yiye a,\nKy1 w4 mpaeb4 mu\nS1 wob1s4 w’akode m’a\nKy1 w4 mpaeb4 mu\nChorus\nMpaeb4 tumi y1 biribiara;\n!de daa ahode b1br1 wo;\nMpren, mmoa ne anigye pa\nKy1 w4 mpaeb4 mu\n2. S1 wob1y1 N’ap1de a\nKy1 w4 mpaeb4 mu\nS1 wob1y1 N’ahy1de a\nKy1 w4 mpaeb4 mu\n3. S1 wop1 Kristosom tumi a\nKy1 w4 mpaeb4 mu\nBra adom ahengua no ho\ndaa\nKy1 w4 mpaeb4 mu\n4. Nyame nko n’4b1ma w’\nw’ahiade,\nKy1 w4 mpaeb4 mu\nWo nhyira fi soro h4 t4nn\nKy1 w4 mpaeb4 mu"
  },
  {
    "id": "twi-81",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 81,
    "title": "HENA ne me, Yehowa a Wode w’aho4den ama me?",
    "lyrics": "HENA ne me, Yehowa a\nWode w’aho4den ama me?\nHena ne me, Jesus,\nWode wo mogya at4 me?\nEyi y1 4d4  $d4 na ay1 saa;\nWode wo d4 na agye me\nEyi y1 4d4 $d4 na ay1 saa;\nJesus, d4 me k4si wu m’\nP AN 971"
  },
  {
    "id": "twi-82",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 82,
    "title": "YESU d4 me, na 4de Ne mogya at4 me",
    "lyrics": "YESU d4 me, na 4de\nNe mogya at4 me\nOwui w4 dua no so maa me\n$de ab1sakra m’animguase\nnipadua yi\nAma mas1 N’anuonyam\nnipadua\nMogya dehye, mogya kronkron\nMogya a efi ne nkekae nni m’\n$de b1sakra m’animguase\nnipadua yi\nAma mas1 N’anuonyam\nnipadua\nP AN 608"
  },
  {
    "id": "twi-83",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 83,
    "title": "MA ELIJAH atade no ngu me so",
    "lyrics": "MA ELIJAH atade no ngu me\nso;\nMa Elijah atade no ngu me so\nNa mafata ama 4ko no,\nNa mako 4k4 n’anim\nMa Elijah atade no ngu me so\nP AN 978"
  },
  {
    "id": "twi-84",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 84,
    "title": "TWE ME b1n Wo, nhyirafo Nyame",
    "lyrics": "TWE ME b1n Wo, nhyirafo\nNyame\nTwe me b1n W’as1nnua no\nTwe me b1n Wo, nhyirafo\nNyame\nTwe me b1n W’as1nnua no"
  },
  {
    "id": "twi-85",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 85,
    "title": "NYAME teasefo Sunsum, gu me so foforo",
    "lyrics": "NYAME teasefo Sunsum, gu\nme so foforo;\nNyame teasefo Sunsum, gu me\nso foforo\nBubu me, nan me nwene me\nhy1 me ma\nNyame teasefo Sunsum, gu me\nso foforo\nP AN 993"
  },
  {
    "id": "twi-86",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 86,
    "title": "W$N a w4tw1n Yehowa nya aho4den foforo",
    "lyrics": "W$N a w4tw1n Yehowa nya\naho4den foforo\nW4de ntaban foro s1 ak4re\nW4tu mmirika na w4mpa aba\nW4nantew na w4mmr1\nAwurade, kyer1 me mpaeb4\nP AN 997"
  },
  {
    "id": "twi-87",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 87,
    "title": "GYINA me nky1n, me kra d4fo pa",
    "lyrics": "GYINA me nky1n, me kra d4fo\npa\nGyina me nky1n, Nyame\nGuamma\nGyina me nky1n me kra d4fo\npa\nMinya wo a, manya ade yinaa\nP AN 1002"
  },
  {
    "id": "twi-88",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 88,
    "title": "S! WIASE mu b4n’ ne mmonsam tumi",
    "lyrics": "S! WIASE mu b4n’ ne\nmmonsam tumi,\nAk4nn4 b4n’ ne abrab4 fun’\nAtor4 adiyi, nnaadaa ne nsisi\nP1 s1 w4hy1 w’as4re so a\nYesu, ka y1n ho,\nNa kyer1 y1n kwan pa\n!mma W’as1mpa kanea no\nNnum w4 y1n mu da\nP AN 1003"
  },
  {
    "id": "twi-89",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 89,
    "title": "Y!REWU a nkyirimma Ama w4anya nkwagye",
    "lyrics": "Y!REWU a nkyirimma\nAma w4anya nkwagye;\nY1rewu ama nkyirimma\nNa w4atena Kristo mu bi.\nP AN 485"
  },
  {
    "id": "twi-90",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 90,
    "title": "SORO aburuburo san bra me kra mu bio",
    "lyrics": "SORO aburuburo san bra me\nkra mu bio\nSor’ aburuburo, bra me mu\nMa menn1w s1 ogya,\n!fis1 Woy1 ogya\nMa mempem s1 nsu, 1fis1\nWo y1 nsu\nMa minyi hua huamhuam s1\nsoro ngohuam\nSor’ aburuburo, bra me so.\nPH 1012, Eunice Johnson"
  },
  {
    "id": "twi-91",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 91,
    "title": "Y! ME HO ns1nkyer1nne ma ensi me yiye",
    "lyrics": "Y! ME HO ns1nkyer1nne ma\nensi me yiye\nNa m’atamfo ahu (x2)\nMa w4n aniwa nhu s1 Wo\nAwurade aboa me, akyekye me\nwer1.\nP AN 1013"
  },
  {
    "id": "twi-92",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 92,
    "title": "MERESIESIE nnipa bi ama w4n tumi",
    "lyrics": "MERESIESIE nnipa bi ama\nw4n tumi\nNa Mama m’ayeyi atena w4n\nanom\nMe honhom b1di w4n kan w4\nasase yi so\nNa w4ahy1 Me din\nanimuonyam\nSi w’as4re, hy1 y1n den,\nOwura,\nKa y1n bom w4 Wo ba no mu;\nMa y1ny1 koro wo nipadua n’mu\nNe Wo ba no ahenni mu\nPAN 1017 Translation by\nJohnson Agyemang Badu"
  },
  {
    "id": "twi-93",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 93,
    "title": "KYER! y1n W’anuonyam, Owura",
    "lyrics": "KYER! y1n W’anuonyam,\nOwura\nKyer1 y1n W’anuonyam,\nOwura\nNa ma 4sore obosu mmr1 y1n\nahodwo\nNa kyer1 y1n W’anuoyam bio\nPAN 1021"
  },
  {
    "id": "twi-94",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 94,
    "title": "MA MENY! s1nea tetefo no y1e",
    "lyrics": "MA MENY! s1nea tetefo no\ny1e\nMa minnyina s1nea wogyinae\nJesus, mesr1 Wo,\nMe Wura, mesr1 wo daa nyinaa\nMa Pentekoste gya no mmra\nme mu.\nP AN 1026, P . B. Appiah-Adu"
  },
  {
    "id": "twi-95",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 95,
    "title": "AMANAMAN 4baatan pa Nyame Agya, y1ma W’amo",
    "lyrics": "AMANAMAN 4baatan pa\nNyame Agya, y1ma W’amo\nYenam Krist’ Ne din mu a\nY1nsuro hwee\nYenim s1 ade rekye a 1sum di\nkan ba\nNyame Agya, 4baatan pa\nK4 y1n mmoa\nP AN 1032"
  },
  {
    "id": "twi-96",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 96,
    "title": "NYAME a tete nna no mu, $nam Pentekost tum’ so",
    "lyrics": "1. NYAME a tete nna no mu,\n$nam Pentekost tum’ so\nHy11 as4re yi ase no\n$te saa nn1 da yi nso\n$de ns1nkyer1nne ne tum’\nnnwuma\nDii w4n as1nka nyinaa akyi\nS1ee mmonsam tum’ saa\nnyarewa ahorow.\nNyan awufo, y11\nanwanwade,\nSiw’gyata no, dum ‘gya tum’\nSaa Pentekost tum’ yi no,\n1te saa nn1 ne daa nyinaa\nO, Awurade, y1 y1n nso saa.\n2. Kan tete as4re no,\n‘Y1 Pentekoste as4re\nW4sii no tum’ yikyer1 so\nKristo ne as4re n’fapem;\nY1n ne saa as4re yi\nnkyirimma\nY1bekura asomafo no kyer1,.\nAy4nkofa pa, abodoobubu,\nNe mpaeb4 m’kosi ase,\nY1de nokwar’ ‘d4, gyidi,\nKoma koro ne koma kronn\nB1toa so nn1 daa nyinaa\nO, Awurade, y1 y1n nso saa\n3. Kristo, asafo no ti,\nW4de s’ro tum’ nyinaa\naky1 y1n,\nS1 y1mfa nnye nnipa nyinaa,\nNsi Wo, Kristo, p1y1 so.\nW’apam b4hy1 no nsakra,\nWo fapem gyina h4 pintinn\n!s1 y1n s1 y1y1 ahw1yie\nW4 fapem ne kyer1 no ho\n!s1 s1 yenyin k4 kan\nW4 gyidi pa nhw1so mu,\nPentekoste yikyer1 no mu\nO, Awurade, y1 y1n nso saa\n4. Krist’ anidaso botae\nNe N’as4r a 4d4 no,\n$de Ne nkwa mogya at4;\nN’asafo ne wiase yi hann\nEkura nyansa, tumi\nakwankyer1\nMa wiase, nnipa, ab4fo\nS1 w4mfa so nhu Nyame\nnyansa\nBebree no ho nnimd1 ‘dom\nA 1nam Kristo dom so\nDe nnidi ne daa anuonyam\nMa Nyame Baasa koro no\nO’Nyame korosa, yehyira\nWo daa\nP AN 1064, M. K. Yeboah"
  },
  {
    "id": "twi-97",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 97,
    "title": "M’AHO$DEN ne no, Awurade, ampa",
    "lyrics": "M’AHO$DEN ne no,\nAwurade,  ampa\nM’ahome ne No  (2)\nMe guank4bea, m’aban dennen\nNe Jesus Christ, Nyame ne ba;\nNe mu na me nkwa hy1\nP AN 1077, E.K. Asmoah"
  },
  {
    "id": "twi-98",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 98,
    "title": "$BR!FO, fa wo ho ma Nyame Na ma w’ani nna $no so daa",
    "lyrics": "1. $BR!FO, fa wo ho ma Nyame\nNa ma w’ani nna $no so daa\nNea n’ani da Yehowa so no\n$nto n’aban w4 anwea so.\n2. $br1fo, dan w’akyi kyer1 wiase,\nNa ma w’ani so hw1\nYesu nko\nMa w’ani so hw1\nasennua no so\nNa wo br1 nyinaa b1br1 ase.\n3. $br1fo, fi esum no m’fi\nNa bra Yesu nky1n,\n$n’ ne hann no\n$beyi wo haw, wo br1,\nne w’amane\n$de wo b1k4 4soro fie\n4. $br1fo, su fr1 w’agyenkwa no\n$b1gye wo so na wagye wo\n$b1ma w’asomdwoe, 1ne\ndaa nkwa\nWo ho b1t4 w’koraa, w’ani\nb1gye\n5. S1 ahum tu b4 w’abrab4 mu,\nNa ‘po as’r4kye b4 fa wo so a,\nYesu no ne y1n seky1n\nne taabon\n$b1hw1 na biribiara ‘y1 komm\nP AN 10882 to 5 verses\nby S.A.K. Karikari"
  },
  {
    "id": "twi-99",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 99,
    "title": "ME Wura, m’ Agyenkwa Merennyae Wo nkae da",
    "lyrics": "ME Wura, m’ Agyenkwa\nMerennyae Wo nkae da;\nMe Wura m’Agyenwa,\nMerennyae Wo nkae da\nHa-lle-lu-ya! Ha-lle-lu-ya!\nHa-lle-lu-ya! Ha-lle-lu-ya!\nHa-lle-lu-ya! Amen"
  },
  {
    "id": "twi-100",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 100,
    "title": "$REMPA me da, $rempa me da",
    "lyrics": "1. $REMPA me da,\n$rempa me da\nYesu d4 n’!remmpa me da\nAde koro na minim s1\nbaabiara a m1k4 n’\nYesu d4 n’1remmpa me da.\n2. $b1n me daa daa\n$b1n me bere biara\nM’Agyenkwa n’, odi\nm’anim daa\n$haw mu,  amane m’,\nawr1how m’, 4yaw mu\nYesu d4n’ 1remmpa me da\n3. M’Awurade Yesu\nmedi w’akyi daa\nMasom wo me nkwa\nnyinaa mu\nMedi Wo nokware w4\nm’akwan nyinaa mu\nMinim s1  Woremmpa me da\nP AN1096 2 to 3 verses\nby S.AK. Karikari"
  },
  {
    "id": "twi-101",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 101,
    "title": "Y1 W’ADWUMA adesae reba Hy1 den w4 wadwuma mu",
    "lyrics": "Y1 W’ADWUMA adesae reba\nHy1 den w4 wadwuma mu\nY1 w’adwuma harehare so ara\nFa w’aho4den nyinaa y1\nAka kakra na ade asa\nW4nny1 adwuma w4 adesae mu\nY1 w’adwuma harehare so ara\nFa w’aho4den nyinaa y1."
  },
  {
    "id": "twi-102",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 102,
    "title": "OGUAMMAA, Nyame Guammaa",
    "lyrics": "OGUAMMAA, Nyame\nGuammaa,\nOguammaa a wokum no y11\nwiase mpata\nHallelu Ya!\nFaw’hodi bi aba ama  w4n a\nw4gye di nyinaa\nAhotefo nyinaa, momm4 ose\nmma No\nJesus ay1 ade nyinaa yiye."
  },
  {
    "id": "twi-103",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 103,
    "title": "D1n na memfa minyi w’ ay1 Tumi Wura, daasebr1?",
    "lyrics": "1. D1n na memfa minyi  w’ ay1\nTumi Wura, daasebr1?\nFa wo hohom pa no ma me,\nNa m’as1m ay1 wo f1\nNa wo d4 ns1nkyer1nne\nNe wo dom no tra m’adwene\nTumfo ne $henk1se\nY1da w’ase, yi way1\n2. S1 mekae me b4ne kwan a\nMeb44 mu ka pii no a\n!ma mef1re me tirim daa\nS1 woky1e me so ara\nNa wukura me hiani\nNa woy1 timm4b4 ma me\nTumfo ne $henk1se\nYeda w’ase yi W’ay1\n3. Wura, wo na wudii m’akyi\nB1gyee me w4 daa ogyam\nDa a me ne nneb4ney1fo\nHwehw1 adefunu no\nWofr11 me se menhwehw1 wo\nW’ahenni ne wo trenee no\nTumfo ne $henk1se\nYeda w’ase yi W’ay1\n4. !t4  dabi a wop1 s1\nWode d4 ba y1n nky1n\nNa dabi nso wohw1 s1\nWonam yaw bi so twe y1n\nS1 yensua wo nney1e,\nNy1 s1 W’as1m kyer1 no,\nTumfo ne $henk1se\nYeda w’ase yi W’ay1\n5. Agya, Woayi w’ahumm4b4\nNe wo d4 no akyer1\nYesu, wo d4 ne wo dom no\nAb1ma m’ani agye;\nNa wo, honhom kronkron,\nda so\nRekyer1 me soro kwan no.\nS1 woma midu h4 a,\nMeyi wo ay1 dabaa\nTwi Dwom 9"
  },
  {
    "id": "twi-104",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 104,
    "title": "M!TO DWOM mama Onyame",
    "lyrics": "1. M!TO DWOM mama\nOnyame\nNa mada no ase daa;\nNa mihu ade nyinaa mu\nS1 4p1 me yiye pa\nAyamye ne mmbor4hunu\n!ne d4 ahy1 no ma\n$de d4 hw1 ne mmofra\nW4 w4n  asetena nyinaa mu\nNne1ma nne1ma sen ak4\nNa w4nne me Nyame d4\n2. Nyame de ne nsa akata\nMe  honam ne me kra so,\nS1 4k4re ntaban a\n$de tr1w ne mma so no,\n!fi s1 4maa me nkwa,\nMew4 me  na yam no po\nNe me nna nyinaa nso\nAbedu nn1 na wahw1 me\nNne1ma, nne1ma ... n a\n3. Ne ba koro a 4d4 no\nNa oyii no mae maa me,\nS1 onnye me mfi me\nb4nem\nNe amanehunukrom,\nAmpa, saa 4d4 yi d44so;\nMe honhom hwehw1 mu a,\nEnhu ne nyinaa mu da;\nEnti na me nso med4 no.\nNne1ma, nne1ma ... n a\n4. Ne honhom n’4de no ma me\nS1 4mfa n’as1m no so\nMmra me mu na 4nkyer1me\nKwan a 1de k4 soro,\nNa 4mm1tew me koma mu;\nNa 4mma me gyidi a\n!b1d1w s1 ‘kanea\nW4 awr1how ne wu mu,\nNne1ma, nne1ma ... n a\n5. $de saa hw1 me kra yiye;\n$hw1 me honam nso;\nOnim nea ehia me\nAnsa na mesr1 no po.\nS1 m’aho4den nn44so\nN’ anka mehwe ase a,\n$no Nyame no ara\nB1s4 me mu ama me so\nNne1ma, nne1ma ... n a\nTwi Dwom 281"
  },
  {
    "id": "twi-105",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 105,
    "title": "Onyankop4n asafo mma Munyi mo ho adi",
    "lyrics": "1. Onyankop4n asafo mma\nMunyi mo ho adi\n$hene Kristo retu sa\nNa mo ne no nk4 bi!\nWasi ne hemfrankaa\nW4ay1 1ho fitaa\nAsennua bea mu k44\nW’ama so de rek4.\n2. Na s1 moy1 n’asuafo\nSua kyer1 no a,\n$de mo fra n’asafo mu\nNa 4ne mo k4 sa.\nWotu ne sa no d1n?\nNa wonya ade b1n?\n$hene tamfo no w4 he?\nNa w4reko w4 he?\n3. S1 wok4som saa hene n’ a,\n$hy1 wo ne trenee,\nNa 4ma wo ne honhom pa\nDe hy1 wo den yiye\nWo nsu ne w’aduan\nNe ne nkwagye as1m\nNa n’ahenni mu daa nkwa\nB1y1 w’akatua.\n4. $ko no, 1w4 wiase,\n$tamfo ne bonsam\n$de ne nnaadaa n’egyigye\nNnipa w4 w4n komam\nNe bo afuw wo s1:\n$ko kosi ase;\n$ko enti som Yesu koraa\nNa woatumi no daa\n5. !s1 s1 wo ne b4ne ko,\nWo hene hy1 wo sa;\nNa enti di n’as1m no so\nDi n’akyi ko kopa\nNa so no mu ara,\nna di nokware daa;\nWo ho akyi a wob1pa\nbenya n’akatua\nTwi Dwom 281"
  },
  {
    "id": "twi-106",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 106,
    "title": "AGYENKWA a 4d44 wiase yi d4 wo ne me",
    "lyrics": "AGYENKWA a 4d44\nwiase yi d4 wo ne me\n$w4 d4 ne ayamhyehye koma\nma y1n;\n$de y1n b4ne aky1 y1n\nWaba ab1tena y1n mu\nY1koto s4re No;\nY1koto s4re No;"
  },
  {
    "id": "twi-107",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 107,
    "title": "Din bi w4 h4 a 1y1 de !y1 Yesu Kristo din",
    "lyrics": "1. Din bi w4 h4 a 1y1 de\n!y1 Yesu Kristo din\n!ma 4yeraba ba fie\nB1home fi ne br1 mu\nChorus:\nM1to n’ayeyi dwom no daa\nW4 N’adom Nkwagye no nti\nYesu Kristo ne me gyefo\nAy1yi nka ne din daa\n2. Kristo ne me kra Agyenkwa\nN’adom nti manya nkwagye\nMahu ne nkwagye basa no\nNea tetefo hwehw11 no\n3. Ne mogya no y1 nkwa\nnsubura\nNea 1pem fi botan mu\nEtumi horo b4ne nyinaa\nMa 4kra nya anigye\n4. Kristo fr1 no y1 fr1 kronkron\n!ma anigye bu so\nN’as1m no ne nkwagye\nkwan no\n!kyer1 4yeraba kwan\n5. Yesu Kristo y1 m’adamfo\n$mmfa biribi nnhinta me\n$kyer1 me nea $p1 nyinaa\nW4 ne kyer1w kronkron no mu\n6. Nokware Kristo din y1 d1\nAma manya ahot4\nM’awer1how adan anigye\nMe kra di ahurusi daa.\n7. M1d4 Wo mekra d4fo pa,\nWo nkutoo na m1d4 Wo;\nM1bata Wo ho daa nyinaa,\nNa mate Wo d4 no nka\nApostolic Twi Nnwom 188"
  },
  {
    "id": "twi-108",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 108,
    "title": "W’asafo ti ne wo, y1n Yesu Y1y1 wo mma, na b1gye y1n",
    "lyrics": "1. W’asafo ti ne wo, y1n Yesu\nY1y1 wo mma, na b1gye y1n\nOguanhw1fo, y1n ho hia wo\nY1y1 wo nguan na b1hw1 y1n\nY1n b4ne nti anka y1ns1 s1\nY1ba wo nky1n b1gye W’ad4e\nNa nso wo mm4bor4hunu d44so\nNa woremma obi ns1e\n2. Y1n Nyame pa, b1hu y1n\nmm4b4\nNa fa wo denhy1 hyira y1n!\nNa y1nso, y1hy1 wo b4 s1:\nYeb1som wo atena wo nky1n;\nMa gyidi pa 4d4 ne nyansa;\nMa y1n ani nna wo so daa!\nMa y1mm4 wo som ho\nmm4den pa\nNa y1mfa soro kwan so da!\n3. Ma y1n nyinaa mmra wo\ndaa homem’\nS1 w’ahennim ahotefo\nNa da bi yennyina wo nifa\nNa y1ntena w’anuonyam nom h4!\nW’asefo ti ne wo, y1n Yesu\nY1y1 wo mma, na begye y1n\nOguanhw1fo, y1n ho hia wo\nY1y1 wo nguan, na b1hw1 y1n."
  },
  {
    "id": "twi-109",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 109,
    "title": "Monna Nyame ase daa W4 wiase mmaa nyinaa!",
    "lyrics": "1. Monna Nyame ase daa\nW4 wiase mmaa nyinaa!\n$somaa ne ba koro\nB1yii y1n awer1ho\n2. Nea tetefo hwehw11\nNea w4n nyinaa ‘ra p1ee\nNea w4n ani gyinae,\n!nna anya aba yi.\n3. Dawid ba k1se no bae,\nN’ahengua no rensakra;\nY1n kra hann ne nkwagye\nYesu mu na 1da adi.\n4. D4fo pa, woasiesie\nNkwagye de ama y1n;\nMeda w’ase na mesr1\nS1 ma minnya me de bi.\n5. Me nkwagye ne m’ahode,\nMema wo akwaaba nn1\nMe wura, b1b4 wo kwan\nNa fa so bra me komam\nTwi Dwom 51"
  },
  {
    "id": "twi-110",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 110,
    "title": "YESU wo ho y1 f1 s1 Wodwo, Wo ho tew",
    "lyrics": "YESU wo ho y1 f1 s1\nWodwo, Wo ho tew,\nNa wo yam ye,\nWohyer1n s1 an4pa nsoromma\nYesu wo ho y1 f1 s1\nPAN 276"
  },
  {
    "id": "twi-111",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 111,
    "title": "WOSO na Wo kr’4n Na Woy1 k1se",
    "lyrics": "WOSO na Wo kr’4n\nNa Woy1 k1se\nWoso na Woy1 k1se\nHena mpo na 4ne Wo b1s1?\nWoso na Woy1 k1se"
  },
  {
    "id": "twi-112",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 112,
    "title": "AWURADE aman nyinaa B1suro Wo",
    "lyrics": "AWURADE aman nyinaa\nB1suro Wo\nNa y1ahy1 Wo din anuonyam\nEfis1 wo nko na Woy1\nKronkron;\nEfis1 W’akwan y1 nokware.\nAman aman hene,\nWo nnwuma y1 ak1se\nNa 1y1 nwanwa\nPAN 304, P .B. Appia-Adu"
  },
  {
    "id": "twi-113",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 113,
    "title": "DAA DAA daa, Oye ma me oo daa",
    "lyrics": "DAA DAA daa,\nOye ma me oo daa\nDaa, daa daa. Oye ma me o!\nDaa, daa daa. Oye ma me o!\nDaa\nDaa, daa daa. Oye ma me o!"
  },
  {
    "id": "twi-114",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 114,
    "title": "$KWAN DEDAW no mu $kwan dedaw no mu",
    "lyrics": "$KWAN DEDAW no mu\n$kwan dedaw no mu\nAwurade rey1 N’adwuma\nW4 ‘kwan dedaw no mu\n$kwan dedaw no mu\n$kwan dedaw no mu\nAwurade rey1 N’adwuma\nW4 ‘kwan dedaw no mu\nP AN 362"
  },
  {
    "id": "twi-115",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 115,
    "title": "Nyankop4n w4 y1n mu Momma y1nkotow no",
    "lyrics": "1. Nyankop4n w4 y1n mu\nMomma y1nkotow no\nNa y1mfa suro nsom no\n$w4 y1n ntam ha\nMony1 komm w4 mo mu\nNa munyi mo yam nn4 no\nKristofo, gyidifo\nMonsom no nokwarem\nMonyi N’ay1 yiye\n2. Nyankop4n w4 y1n mu\n$n’ na kerubim no\nDe soro ne f1re som no\nSerafim to dwom s1\nKronkron ara kronkron\nNe y1n Nyankop4n Yehowa\nY1n so kamfo wo\nSr1 s1 hu y1n mm4b4\nDom y1n na hw1 y1n so\n3. Y1de y1n adwene\nY1n honhim ne y1n kra\nNe y1n honam de hy1 wo\nnsa\nY1pa y1n ak4nn4\nY1 4bonsam no\nY1n wiase nneb4ne\nY1som wo, wo nkutoo\nAnuonyam ne nidi\nNe nyinaa y1 Wo de\n4. W’anuonyam k1se bim\nMa y1nhu no yiye\nNa y1nyi y1n yam nsom wo,\nMa y1ns1 w’ab4fo\nS1nea w4hw1 wi\nNa w4di w’anom as1m so\nMa y1ny1 nea Wop1\nNa y1nkae w’as1m no\nW4 ade nyinaa mu.\n5. Wote s1 mframa\nWohy1 mmaa nyinaa ma,\nNa woatwa y1n ho ahyia\nY1n honhom fi wo mu\nWohw1 y1n honhom so\nEnti na 4hwehw1 wo bi\nYi wo yam gye y1n tom’\nY1nhwehw1 4foforo\nWo nko na y1p1 wo\nTwi Hymn 186"
  },
  {
    "id": "twi-116",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 116,
    "title": "$MAN Ghana ba Tow ehurusi ndwom",
    "lyrics": "1. $MAN Ghana ba\nTow ehurusi ndwom\nNyame agye wo nkwa\nAdom wo, ehyira wo\nTr1 wo ntamadan m’,\nBenkum na nyimfa\nAdom Ewuradze,\nEhu wo so mb4rb4r.\nChorus\nW’ebisadze nyinaa\nWo Nyame b1y1 ama w’\nWo y1fo nye w’kun\nNe dzin nye Ewuradze\n$mandzehunyi a\nDa bi ehum tuu wo\nAdom Ewuradze\nEhu wo so mb4rb4r\n2. $MAN Ghana ba\nDa wo Nyame ase\nNyame mba rok4 a\nWo nso ka ho worok4\nSo1r huntuma mu\nBisa adze k1se\nAdom Ewuradze\nEhu wo so mb4rb4r\n3. $MAN Ghana ba fa\nnsemb4 dzi d1w\n$tamfo biara nkotum as11\nwo bio\nWo ndaamba y1 siar\nW’awiei b1y1 f1w\nAdom Ewuradze\nEhu wo so mb4rb4r"
  },
  {
    "id": "twi-117",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 117,
    "title": "1 MONTO dwom d1d1 nyi Awurade ay1",
    "lyrics": "1 MONTO dwom d1d1 nyi\nAwurade ay1\nMonto dwom d1d1 mma no;\nMomfa oseb4 nyi\nAwurade ay1\nMonto dwom d1d1 mma no\nChorus\nKristo y1 nkunimdi hene\nampa\nNe mogya adi nkunim\nW’agye ‘deb4ney1ni 4te s1\nme\nMonto dwom d1d1 mma no.\n2. Monto dwom d1d1 nyi\nAwurade ay1\nMonto dwom d1d1 mma no\n$de me b4ne nyinaa aky1\nMonto dwom d1d1 mma no.\n3. Monto dwom d1d1 nyi\nAwurade ay1\nMonto dwom d1d1 mma no\nNe mogya nti manya ‘hofadi\nMonto dwom d1d1 mma no\n4. Monto dwom d1d1 nyi\nAwurade ay1\nMonto dwom d1d1 mma no\n$sahene Kristo adi nkunim\nMonto dwom d1d1 mma no\n5. Monto dwom d1d1 nyi\nAwurade ay1\nMonto dwom d1d1 mma no\nS1 mihu m’agyenkwa anim a\nM1to dwom d1d1 ama no\nApostolic Twi Dwom 196"
  },
  {
    "id": "twi-118",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 118,
    "title": "W’ayamye nti, O M’agyenkwa",
    "lyrics": "W’ayamye nti,\nO M’agyenkwa\nMeyi W’ay1 mmorodo ara daa\nMa wo Sunsum kronn\nnkyer1kyer1 me\nMmr1 mensi nn4 Wo\nMmorodo ara!\nMmorodo ara!\nmmorodo ara!\nAo, med4 Wo M’agyenkwa\nMmorodo ara!"
  },
  {
    "id": "twi-119",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 119,
    "title": "WAY! ade nyinaa yiye (2x) Wama asotifo ate as1m",
    "lyrics": "WAY! ade nyinaa yiye (2x)\nWama asotifo ate as1m,\nWama mmum akasa\nWama asotifo ate as1m,\nWama mmum akasa\nP AN 97"
  },
  {
    "id": "twi-120",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 120,
    "title": "ADOM na w4de nam gyidi so agye mo nkwa",
    "lyrics": "ADOM na w4de nam gyidi so\nagye mo nkwa\nNa emfi mo ankasa,\n!y1 Onyame aky1de\nNa emfi nnwuma mu,\nNa obiara anhoahoa ne ho\nAdom na w4de nam gyidi so\nagye mo nkwa.\nPAN 598"
  },
  {
    "id": "twi-121",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 121,
    "title": "OWUS$RE; frankaa rehim (2x) S1 wugye Yesu di de a",
    "lyrics": "OWUS$RE; frankaa rehim (2x)\nS1 wugye Yesu di de a\nWob1s4re ma wobenya nkwa\nAfi owu amoa mu\nP AN 605"
  },
  {
    "id": "twi-122",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 122,
    "title": "AD$FO, afei na y1y1 Nyame mma",
    "lyrics": "AD$FO, afei na y1y1\nNyame mma\nNa nea y1b1y1 no nnya nnaa\nadi\nYenim ampa s1 y1b1y1,\nY1b1y1 s1 $no, y1b1y1 s1 $no\nY1behu N’s1nea $te.\nPent Hymn 60 P AN 698"
  },
  {
    "id": "twi-123",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 123,
    "title": "S1nea daakye bi Y1behyia No ni",
    "lyrics": "S1nea daakye bi\nY1behyia No ni;\nWiase aman nyinaa,\nKasa horow nyinaa,\nY1de anigye behyia No,\nNa y1ato Hallelu Ya ama\nNe din\nP AN 36"
  },
  {
    "id": "twi-124",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 124,
    "title": "Agya pa bi refr1 wo s1 bra fie",
    "lyrics": "1. Agya pa bi refr1 wo s1 bra\nfie\nAgya d4fo refr1 wo s1 bra\nfie\nOnim nea ehia wo,\n$b1y1 ama wo\n$y1 Kwankyer1fo,\n$b1kyer1 w’kwan pa\n2. $y1 $yaresafo,\n$b1sa wo yare\n3. $y1 $fotufo,\n$b1tu w’fo pa\nP AN 1104"
  },
  {
    "id": "twi-125",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 125,
    "title": "Wo p1, ny1 me p1 na 1ny1 Wo p1, ny1 me p1 na 1ny1",
    "lyrics": "Wo p1, ny1 me p1 na 1ny1\nWo p1, ny1 me p1 na 1ny1\nBoa me ma minhu\nNea woahy1hy1 ama me\nWo p1, ny1 me p1 na 1ny1\nP AN 1112"
  },
  {
    "id": "twi-126",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 126,
    "title": "Mahu Yesu, Yosef ba no, Nea Tetefo kaa ne ho as1m n’",
    "lyrics": "Mahu Yesu, Yosef ba no,\nNea Tetefo kaa ne ho as1m n’\nSo biribi pa bi betumi afi\nNasaret aba?\nMommra mm1hw1\nMommra mm1hw1 Yesu,\nAgyenkwa no\nMommra mm1hw1"
  },
  {
    "id": "twi-127",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 127,
    "title": "W’as1m so na m’ani da Wo b4hy1 no na meretw1n",
    "lyrics": "W’as1m so na m’ani da\nWo b4hy1 no na meretw1n\nW’animtew n’ma minya nhyira\nAnuonyam nka Nyame\nGuammaa\nPAN 1106"
  },
  {
    "id": "twi-128",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 128,
    "title": "AGYENKWA Yesu wu maa me Meda N’ ase daa",
    "lyrics": "AGYENKWA Yesu wu maa me\nMeda N’ ase daa,\nAgyenkwa Yesu wu maa me;\nMeda N’ ase daa;\nP AN 9"
  },
  {
    "id": "twi-129",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 129,
    "title": "AYEYI na mede ma Nyame !bere a mete ase yi na meyi",
    "lyrics": "AYEYI na mede ma Nyame\n!bere a mete ase yi na meyi\nm’Awurade ay1\nAsaman ase nni ayeyi bio;\nAnuonyam nka $sorosoro hene\nP AN 4"
  },
  {
    "id": "twi-130",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 130,
    "title": "DAVID sanku a $b4 ma Yehowa; (2)",
    "lyrics": "DAVID sanku a\n$b4 ma Yehowa; (2)\nMomma y1mm4, y1mfa y1n\nano mm4\nY1mfa y1n koma nka ho\nY1mfa y1n koma nka ho\nP AN 84"
  },
  {
    "id": "twi-131",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 131,
    "title": "NEA Way1 ama me, $s1 ayeyi Nea Way1 ama me $s1 nnaase",
    "lyrics": "NEA Way1 ama me, $s1 ayeyi\nNea Way1 ama me $s1 nnaase\nMeyi Nay1, m1da N’ase\nNea W’ay1 ama me, $s1 ayeyi.\nP AN 117"
  },
  {
    "id": "twi-132",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 132,
    "title": "DA no b1y1 nkonim nkonimdi da",
    "lyrics": "DA no b1y1 nkonim nkonimdi\nda,\nDa no b1y1 nkonim  d1n ara!\nY1b1to Hosiana w4 $hene\nn’ahemfie\nDa no b1y1 nkonim d1n ara!\nP AN 697"
  },
  {
    "id": "twi-133",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 133,
    "title": "ANKA manya s1 mas1 Wo, Jesus",
    "lyrics": "ANKA manya s1 mas1 Wo,\nJesus\nAnka me suban nyinaa as1 Wo\nde\nAhobr1ase, nokware, 4d4\nkommy1 ne trenee ahy1 me ma.\nP AN 711"
  },
  {
    "id": "twi-134",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 134,
    "title": "DAA nyinaa, Awurade Nne1ma mmi1nsa yi na mesr1",
    "lyrics": "DAA nyinaa, Awurade\nNne1ma mmi1nsa yi na mesr1\nS1 mehu Wo yiye\nM1d4 Wo yiye\nMedi W’akyi yiye\nDaa nyinaa\n“Day by Day”\nPent. Hymn 323\nP AN 1036"
  },
  {
    "id": "twi-135",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 135,
    "title": "M’ASOMDWOE apam w4 h4 ma w4n a",
    "lyrics": "M’ASOMDWOE apam w4 h4\nma w4n a\nW4afa M’as1m na way1\nW4b1y1 s1 dua a esi asub4nten ho\nNa w4b1sow aba w4 ne bere mu\nW4renwu da, w4b1tena ase\nNa w4ahy1 me anuonyam\nP AN 1154, Eunice Addison"
  },
  {
    "id": "twi-136",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 136,
    "title": "YESU ne nkwa botan no Ne mu na nkwage ahy1 ma",
    "lyrics": "1. YESU ne nkwa botan no\nNe mu na nkwage ahy1 ma\nEnti foro saa botan no\nNa wo nkwagye asi pi.\n2. Yesu ne Onyame Ba a,\n$somaa no baa wiase\nS1 Ommewu mma nnipa mma\nNa wo nkwagye asi pi.\n3. Bere a wiase aduru sum\nNa nnipa nnya baabi mfa\n!no mu na Yesu bae\nMa nnipa mma anya nkwagye\n4. Yesu mogya y1 asuten\nNe mu na nkwa abu so\nEnti bra b1nom nsu no bi\nNa wo nkwagye asi pi\n2-4 verses by S.A.K. Karikari"
  },
  {
    "id": "twi-137",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 137,
    "title": "Morotw14n ne mbae no W4 Sor adampan mu",
    "lyrics": "Morotw14n ne mbae no\nW4 Sor adampan mu\nMorotw14n me Jesus,\n$nk1ky1r na waba\nMerets1w, na meretsie\nNdze a 1b1tse1m 4dasum\nMorotw14n me Jesus,\n$nk1y1r na waba\nWahy1 b4 d1 4b1fa m’\nDze me ak1tsena\nN’enyimyam mu\nWahy1 b4 d1 $b1ma m’\nKonyim ahenky1w na m’asoa\nMerets1w, na meretsie\nNdze a 1b1ts1m 4dasum\nMorot14n me Jesus,\n$nk1y1r na waba\nP AN 585"
  },
  {
    "id": "twi-138",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 138,
    "title": "Nnipa nyinaa besi d1n ate ns1mpa yi?",
    "lyrics": "Nnipa nyinaa besi d1n ate\nns1mpa yi?\nNo ho mmuae no Jesus de maa\ny1n\n“Na s1 w4ma me so fi asaase\nso a,\nM1twe nnipa nyinaa ama\nMe ho” (2)\nMa No so, Ma No so;\n$da ho fi sor’ h4 kasa;\n“Na s1 w4ma Me so fi asaase\nso a\nM1twe nnipa nyinaa ama Me\nho”"
  },
  {
    "id": "twi-139",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 139,
    "title": "Onyankop4n Kronkron $henk1se",
    "lyrics": "Onyankop4n Kronkron\n$henk1se\nWo tumi so oo!\nWo tumi so oo! (2)\nWoy1 Onyame k1se na wo\ntumi so\nWoy1 Onyame k1se na\nWod4e1 d44so\n$sorosoro Nyankop4n,\nwo tumi so\nWo tumi so oo!\nWo tumi so oo! (2)"
  },
  {
    "id": "twi-140",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 140,
    "title": "Jesus resiesie tenabea w4 Sor’ $de sika ne Jaspa abo",
    "lyrics": "Jesus resiesie tenabea w4 Sor’\n$de sika ne Jaspa abo\n$b1ba ber1 a ani nna\nNa wab1fa n’ahotewfo nyinaa\nak4\nAna y1b1k4 h4, Alleluia\n!me m1k4 h4, Alleluia\nWo nso wob1k4 h4 Alleluia\nAlleluia, y1n nyinaa b1k4 h4\nP AN 281"
  },
  {
    "id": "twi-141",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 141,
    "title": "Jesus mogya repram Jesus mogya repram",
    "lyrics": "Jesus mogya repram\nJesus mogya repram\nJesus mogya repram b4ne so\n$refa wiase nnommum ak4ma\nJesus\nJesus mogya adi nim\nP AN 271, Eunice Addison"
  },
  {
    "id": "twi-142",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 142,
    "title": "W’ayi me afiri d4te p4t44 no mu $de m’anan asi 4botan so",
    "lyrics": "W’ayi me afiri d4te p4t44 no mu\n$de m’anan asi 4botan so\n$de adwomto ahy1 makoma mu\nAyeyi nnwom, Alleluya\nEunice Addison"
  },
  {
    "id": "twi-143",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 143,
    "title": "W4awo m’4ba Menna ho nni nkoasom m’",
    "lyrics": "W4awo m’4ba\nMenna ho nni nkoasom m’\nM’agya awo m’ ato abusua\nfoforo m’\nSor’ ab4fo apor4 redi’danse\nM’agya awo m’ ay1 ne de koraa\nP AN 239 Mfantse\nEunice Addison"
  },
  {
    "id": "twi-144",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 144,
    "title": "Nkonimdi! Nkonimdi! Mogya dehye t4 nkonim",
    "lyrics": "Nkonimdi! Nkonimdi!\nMogya dehye t4 nkonim\nNkonimdi! Nkonimdi!\nNkonim abere nyinaa\nS1 Yehowa te ase yi\n$ma sunsum m’ aho4den\nMa w4n a w4twer’ no\nDi nkonim abere nyinaa (x2)\nP AN 229"
  },
  {
    "id": "twi-145",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 145,
    "title": "$AGYE m’ mbordo ara Nyame, $agye m’ mbordo ara",
    "lyrics": "$AGYE m’ mbordo ara\nNyame, $agye m’ mbordo ara\n$ahohor mo ho b4n nyinaa\nNye mo ho nkekaa nyinaa;\n$agye m’ mbordo ara\nNyame, $gye m’ mbordo ara\nMb4huhor N’ na mato N’\nndwow\n‘Siand1 4agye m’ mbordo ara\nP AN 109, Eunice Addison"
  },
  {
    "id": "twi-146",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 146,
    "title": "Ana W’akoma p1 nhyira? Foro, foro bra sorsor",
    "lyrics": "Ana W’akoma p1 nhyira?\nForo, foro bra sorsor\nForo b4hw1 Jesus N’aho4f1w;\nMbr1 enyimnyam ndzepa ebu do\nP AN 155, Eunice Addison"
  },
  {
    "id": "twi-147",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 147,
    "title": "DWEN papa a $y1 ma wo n’ ho Dwen papa a $y1 ma wo n’ ho",
    "lyrics": "DWEN papa a $y1 ma wo n’ ho\nDwen papa a $y1 ma wo n’ ho\nS1 ehum rotu a\n$dze w’ besie yie\nDWEN papa a $y1 ma wo n’ ho\nP AN (Mfantse) 176\nEunice Addison"
  },
  {
    "id": "twi-148",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 148,
    "title": "JESUS, Jesus, Jesus Jesus, nye mo botantsim",
    "lyrics": "JESUS, Jesus, Jesus\nJesus, nye mo botantsim;\nJesus, Jesus, Jesus\nJesus na motwer No.\nP AN (Mfantse) 195"
  },
  {
    "id": "twi-149",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 149,
    "title": "YEBETUMI ak4 ak4fa asase no Fi Jordan agya ak4si mpoano",
    "lyrics": "YEBETUMI ak4 ak4fa asase no\nFi Jordan agya ak4si mpoano;\nMmom gyata n’ b1b4 mm4den\nasi y1n kwan de1\nNyame n’ara de nkonim b1ba\nNkonim firi Ewurade (x2)\nWadi nkonim ama n’as4re\nYebehim nkonimdi frankaa no\nP AN (Mfantse) 208"
  },
  {
    "id": "twi-150",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 150,
    "title": "JESUS mogya nko na Otum horo me kra ho",
    "lyrics": "JESUS mogya nko na\nOtum horo me kra ho;\nOtum horo me b4ne ma mey1\nfitaa;\nBibiara nnkotum ahor m’ ma\nmadi mu\nGyes1 Jesus mogya no nko\nMogya a 1hor’ fi, 4sor aho4den;\nYiw Jesus Ne magya n’ sombo\nAfer’b4de yi mogya ahy1 no ma\nYiw Jesus Ne mogya n’sombo\nAlleluia! kamfo Nyame\nAlleluia! kamfo Nyame"
  },
  {
    "id": "twi-151",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 151,
    "title": "NYAME ahy1 b4 s1 $de daa nkwa b1ma",
    "lyrics": "1. NYAME ahy1 b4 s1\n$de daa nkwa b1ma\nObiara a $gye Yesu, Ne d4\nBa no di\nChorus\nHallelu Ya Wawie;\nMigye $ba no di\nNea wokum no ne mogya\nno agye me (x2)\n2. S1 4kwan no mu nny1\nNa amane w4 mu a\nAmpa Yesu betumi s1\n$de y1n twa.\n3. Mihu ad4fo bi nso\nW4 anuonyam mu;\nW4agye w4n nkwa na\nw4n nnwom ara ne s1:\n4. Mihu ahene ne adiyifo bi\nnso s1\nW4nenam sika abor4n so na\nW4r’to nnwom yi\n5. Nnwom no bi w4 h4 ma\nMe ne wo nyinaa\nY1n ayeyi nnwom a y1b1to\ndaa ne s1:\n‘Tis The Promise of God full\nSalvation\nP .P . Bliss Pent Hymn 163"
  },
  {
    "id": "twi-152",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 152,
    "title": "YEBEDI d1w bi da bi Yebedi d1w bi da bi",
    "lyrics": "1. YEBEDI d1w bi da bi\nYebedi d1w bi da bi\nNyame n’adwuma 4br1 w4\nmu ampa\nYebedi d1w bi da bi\n2. Y1b1k4 s’ro ahemman mu\nAk4tenaa ne nky1n h4 daa\nS1 yedi N’akyi nokware\nmu de a\nY1b1k4 s’ro ahemman mu.\n3. Obehyia y1n s’ro h4\nNa wama y1n akwaaba\n$b1ma y1n amo, wama y1n\nabotri\nYebedi d1w bi da bi\nP AN 708 2-3 verses by\nS.K. Karikari"
  },
  {
    "id": "twi-153",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 153,
    "title": "Y!B!S! No, s1 Yesu Kristo Nyame Ba no ba a",
    "lyrics": "Y!B!S! No, s1 Yesu Kristo\nNyame Ba no ba a,\nY1ne No b1s1\nY1b1s1 No s1 Yesu Kristo\nNyame Ba no ba a\nY1 ne No b1s1\nChorus\nSaa bere yi 4resiesie y1n\nSaa bere yi, 4de\nN’as1mpa no rey1n kra\nY1b1s1 No s1 Yesu Kristo\nNyame Ba no ba a\nY1ne No b1s1\nEunice Addison, P AN 710"
  },
  {
    "id": "twi-154",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 154,
    "title": "MENYA ngyirama apem matow ndwom",
    "lyrics": "1. MENYA ngyirama apem\nmatow ndwom\nMeyi mo Pomfo ay1w\nMakamfo me Hen\nN’enyimnyam\nN’adom no konyimdzi\n2. Mo Wura d4y1fo, me\nNyankop4n\nBoam’ ma momb4 dawur,\nMemfa Wo dzin n’enyidzi no\nMentahye mbea nyinaa\n3. Jesus ! dzin a otu h1n suro,\n$ma ‘wer1how b4 adze;\n$y1 sanku w4 ab4n asom’\n$y1 nkwa nye asomdwee.\n4. $kasa, na wotsie Ne ndze a,\nEwufo nya nkwa bio,\nAkoma wer1honyi dzi d1w\nHianyi buroburo gye dzi\n5. Odwuru b4n no tum koroa,\nOtu daduanyi duam;\nNo b4gyaa tum san fifo ho;\nOdzii nyim maa mo so.\n6. Hom b4n nyinaa da Jesus do:\nWokum Nyame Eguambaa\nW4dze Ne kra so b4 af4r\nMaa obiara ne kra\nCAN 1 Charles Wesley"
  },
  {
    "id": "twi-155",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 155,
    "title": "WONYI Nyame Hen ay1w W4mfa ay1yidwom mmr1 N’",
    "lyrics": "1. WONYI Nyame Hen ay1w\nW4mfa ay1yidwom mmr1 N’\nN’ehumm4b4r tim h4 daa\nosi pi y1 nokwar daa\n2. Wonyi N’ ay1w: 4ay1 ewia\nD1 4k4 apr4w daa daa nyinaa\n3. Na eso 4ay1 bosoom,\nMa odu anafua a 4hyer1n\n4. Enyimnyam nka, H1n d4y1fo\nAb4bze nyinaa ntow\nenyimnyam\nEnyimnyam, nka Egya, nye Ba\nNye Sumsum, Ebiasa kor\nAmen\nCAN 9 Henry Williams Baker,\n1821-7"
  },
  {
    "id": "twi-156",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 156,
    "title": "MBR! Jesus Ne dzin dua y1 d1w",
    "lyrics": "1. MBR! Jesus Ne dzin dua\ny1 d1w\nW4 gyedinyi asom’ a!\nOtu ne yaw, y1 ne yar edur,\nNa otu no suro nyinaa\n2. $b4 sunsum a oepira esu,\nNa 4dwe akoma a 4ahaw;\nEdziban ma sunsum a k4m\ndze n’\nAhomgye ma fonafo\n3. Dzin pa! Botan a motow do\nMe ky1m na mo sumabew,\nM’egyapadze a4mmpa da,\nAdom na 4ahy1 n’ ma!\n4. Jesus, mo Guanhw1fo, mo Nua\nMo S4foe na me Hen\nMo Wura, mo Nkwa,\nmo Kwan, m’Ewiei,\nBra b1gye m’ay1yi.\n5. Mo mb4dzemb4 4y1 mber1w,\nM’akoma y1 w44w4w;\nNa ber a m’bohu W’d1 mbr1\n$wo tse n’\nM’beyi W’ ay1w d1 mbr1 4s1\n6. K1pem da n’ na m’b1ka\nWo d4 no,\nMedze nkwanhwea tsiabaa ‘i;\nNa ma Wo nsaku dzin d11d1w n’\n$nhom me kra w4 wum’.\nAmen.\nCAN 25 - John Newton,\n1725-1807"
  },
  {
    "id": "twi-157",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 157,
    "title": "$KO k1se no ab4 adze Afei h1n Sahen edzi nyim",
    "lyrics": "1. $KO k1se no ab4 adze\nAfei h1n Sahen edzi nyim;\nW4nhy1 ehurusi ndwom n’ase\nAlleluia!\n2. Owu hyehy1 no d4m petsee,\nNa Christ ab4 h4n apetse;\nW4mb4 se ntow enyigye\nndwom\nAlleluia!\n3. Awer1how ndaasa no etwam\n$aso1r konyim mu efi wum’;\nEnyimnyam nka Hen\ntseasefo n’\nAlleluia!\n4. Ewuradze, W’amandzehu ntsi\nGye Wo nkowaa fi wu no\nb4r mu,\nMa yeenya nkwa, yaatow\nWo ndwom\nAlleluia!\nCAN 67"
  },
  {
    "id": "twi-158",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 158,
    "title": "MBR! metse yi ara minnyi hwee ka",
    "lyrics": "1. MBR! metse yi ara minnyi\nhwee ka\nD1 w4kaa Wo b4gyaa gui\nmaa m’\nNa efr1 m’ d1 membra Wo\nnky1n\nNyame Eguambaa, maba\n2. Mbr1 metse ya ara\nmonnk4tw1n de\nMara meper tu me kra ho fi,\n‘Wo na Wo b4gyaa tum tu fi,\nNyame Eguambaa, maba\n3. Mbr1 metse ya ara, hianyi,\nfurafo;\nEnyiwa 4nye ahonya,\nDza mihia nyinaa w4 Wo mu,\nNyame Eguambaa, maba\n4. Mbr1 metse ya ara, Wo d4\nk1se n’\nEbubu mpampi nyinaa mu,\nN-kyii m’b1y1 Wo nko Wodze,\nNyame Eguambaa, maba\nCAN 114 - Charlotte Elliot\n(1789-1871)"
  },
  {
    "id": "twi-159",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 159,
    "title": "EWURADZE, W’as1m tsim, ‘No na y1hw1 nantsew",
    "lyrics": "1. EWURADZE, W’as1m tsim,\n‘No na y1hw1 nantsew,\nNyia 4gye no nokwar\nNya kan nye enyigye\n2. Atamfo ba h1n do a,\nW’as1m yi hy1 h1n dzen\nAwer1kyekyer ns1mpa,\nN-kwagye amandz11\n3. $bra n’ehum tu h1n\nNa sum gye h1n do a\nNe kan hyer1n ma h1n\nNa 4kyer1 h1n kwan\n4. Woana botum akyer1\nAhot4 nye d1w a\nW’as1mpa yi dze ma\nN-tsetsekwaa nyinaa\n5. Ehumb4b4r ns1mpa,\n$baa atseasefo;\nN-kwas1m, 4kyekye\nH4n a w4da wuso wer1\n6. Ewuradze, ma yenhu\nNo mu adesua kr4nkr4n n’\nNa yaad4, yeesuro Wo,\nDaa nyinaa yaab1n Wo!\nCAN 90 Henry Williams Baker,\n(1821-77)"
  },
  {
    "id": "twi-160",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 160,
    "title": "KANEA a y1dze hw1 h1n kwan mu",
    "lyrics": "1. KANEA a y1dze hw1 h1n\nkwan mu\nMma y1ammfom kwan\ny1annyew;\nAdom N-su a ofi sor t4\nMa akwantufo nom bi;\n2. Ediban a ofi sor t4\nMa y1dze ny1n h1n kra\nNwoma a y1kenkan a yehu\nMbr1 4sor man mu tse;\n3. $y1 gyafadum anadwo,\nMununkum adekyee;\n$bra po tu ne tsir gu do a\nH1n seky1 nye tabon\n4. Onyame Twerammpon N’saem,\nN’enyimnyam Ba N’Ahy1mu\nYeenya wo a yeentum bra\nyi b4,\nYenntum nnya Nyame man.\n5. Ewuradze, dom hen ma\nyensua\nW’as1m mu nyansa n’ yie,\nNa y1mfa mbofra ‘koma ngye\nNe nkyer1kyer1 kr4nkr4n no.\nCAN 91- Bernard Barton\n(1784-1849)"
  },
  {
    "id": "twi-161",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 161,
    "title": "SUNSUM Kr4nkr4n, bra h1n ‘komam’",
    "lyrics": "1. SUNSUM Kr4nkr4n, bra\nh1n ‘komam’,\nMa y1ntse Wo tum no,\nWo na tsetse w4dze W’hy11\nnk4m\nNa kan na d4 fir Wo.\n2. Bra, na $wo na nk4nhy1fo\nDze W’kyer1wee, dze Wo kae;\nBue nokwar no,\n$wo nye saafee n’\nTsew nwoma kr4kr4n n’ano\n3. Sor Ebubur, tr1\nW’atsabann m’\nW4 h1n isum no do\nButuw h1n kra no sum no do,\nNa ma h4 4ny1 kann\n4. S1 ‘hyer1n h1n mu a,\ny1nam Nyame\nNankasa do bohu N’,\nNa y1nye wo mba nyinaa\nesusu\nOnyame d4 no bun. Amen\nCAN 89 - Charles Wesley\n(1707-88)"
  },
  {
    "id": "twi-162",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 162,
    "title": "AO bra ma yendzi d1w S1n nkan n’ mey1 hianyi a",
    "lyrics": "1. AO bra ma yendzi d1w\nS1n nkan n’ mey1 hianyi a,\nAfei menya Nyame ho d4,\n$de a 4ky1n sika\n2. Ao bra ma yendzi d1w\nS1 nkan n’ mot44 bahwa a,\nAfei menya Nyame ho d4,\nN-abaw we4n me dabaa.\n3. Ao bra ma yendzi d1w\nS1n nkan n’ mob44 eko a,\nNyame dze No d4 atwe me\nD1mensan m’ Egya fie\n4. Ao bra ma yendzi d1w\nN-ky1 me kra reyew,\nM’Agyenkwa Jesus ab4twe m’\nW4 h4n na ab4nsam nsa.\n5. Ao bra ma yendzi d1w\nAfei menya Ny4nko a\nNo d4 ky1n onua mpo no d4\n$d4 a onnyi ewiei a.\n6. Ao bra ma yendzi d1w\nAo, ‘wo a ed4 Jesus,\nNyame N’ab4dze nyinara,\nWonsuo m’ yenyi N’ ay1w\nCAN 138"
  },
  {
    "id": "twi-163",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 163,
    "title": "Wo nky1n ara, Nyame, Wo nky1n ara!",
    "lyrics": "1. Wo nky1n ara, Nyame,\nWo nky1n ara!\nKaansa mbeamudua mpo\nNa 4ma mo do a,\nMo ndwom dabaa nye d1\nWo nky1n ara, Nyame,\nWo nky1n ara!\n2. Kaansa mirikyin mpo\nMa wi ak4t4\nMa adze so asa me,\nMa mesun bo a,\nM’adaaso mu m’bepin\nWo nky1n arA Nyame\nWo nky1n ara!\n3. Ma kwan m’b1da h4 a\nW4dze k4 sor;\nDza edze ma m’ nyina,\nAb4fo refr1fr1 m’\nWo nky1n ara, Nyame\nWo nky1n ara!\n4. Ber a m’enyi b1tsetsew n’,\nM’beyi W’ay1w;\nM’bodua m’awer1how mu\nM’esi Nyame fi;\nMenam me yaw m’\nm’bepin\nWo nky1n ara, Nyame\nWo nky1n ara!\n5. S1 so medze ahomka\nMutu ba sor,\nMo Wer1 fir wi bosoom,\n$nye nworaba a,\nMo ndwom mber nyinaa\nnye d1\nWo nky1n ara, Nyame\nWo nky1n ara!\nCAN 152 - Sarah Flower\nAdams (1805-48)"
  },
  {
    "id": "twi-164",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 164,
    "title": "ASODZI da mo do D1 miyi Nyame ay1w",
    "lyrics": "1. ASODZI da mo do\nD1 miyi Nyame ay1w\nMegye me kra a onnwu da\nnkwa,\nNa mema 4s1 sor\n2. Mosom mbersantsen yi,\nMidzi duma a woahy1 m’\nAo, nky1 medze m’ahom\nnyinaa\nMaay1 mo Wura Ne p1!\n3. Fa nhw1yie b4 me ban\nMa mentsena d1 ihu m’;\nNa. mo Wura, siesie\nWo somfo\nNa meebu nkontaa pa\n4. Boa m’ ma monwe4n\nmons4r,\nNa montwer Wo nkotoo\nMinyim d1 mogor m’e\neduma ho a,\nM’bowu wua onnyi ewiei\nCAN 188 - Charles Wesley\n(1707-88)"
  },
  {
    "id": "twi-165",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 165,
    "title": "KENYAN W’edwuma yi, Ewuradze, kyer1 Wo tum",
    "lyrics": "1. KENYAN W’edwuma yi,\nEwuradze, kyer1 Wo tum;\nB4 Wo ndze a onyanewufom’\nNa ma Wo nkor4fo ntse\nChorus:\nKeyan W’edwuma yi,\nBer a y1kotow Wo yi\nSian, ao, Ewuradze domfo,\nsian!\nBra behyira h1n sesei\n2. Kenyan W’edwuma yi,\nMa akra nhwehw1 nkwa-su n’;\nO ma h1n esunsum k4n nd4\nN-kwa edziban no!\n3. Kenyan W’edwuma yi,\nKr4n W’enyimnyam dzin no;\nWo Sunsum mma h1n d4\nm-fram\nMma W’ nye Wo mba nyinaa\n4. Kenyan W’edwuma yi,\nMa W’as1m no nnya tum;\nMa w4mfa enyikan gyedzi ntsie\nW’as1mpa a nhyira w4m’ n’\n5. Kenyan W’edwuma yi,\nT4 Pentecost b4w no;\nNa enyimnyam no b1y1 Wodze\nNa hyira n’ aka h1n\nCAN 240 - Albert Midlan\n(1825-1909)"
  },
  {
    "id": "twi-166",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 166,
    "title": "M!TO Awurade ho dwom Na ma ma wama ne ho so (2)",
    "lyrics": "M!TO Awurade ho dwom\nNa ma ma wama ne ho so (2)\nM’aho4den ne me nnwomto ne\nYehowa\nNa way1 me nkwagyefo\n$no ne me Nyankop4n 4y1 m’\nm’Agya\nNa m1kamfo no\nNa m1ma No so"
  },
  {
    "id": "twi-167",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 167,
    "title": "WAFA m’animguase, de k4 asennua no so",
    "lyrics": "1. WAFA m’animguase, de k4\nasennua no so\nDe sesaa N’anuonyam de\nmaa me\nWafa me mmusub4 de k4\nasennua no so\nDe sesaa abrab4 pa de maa me\nChorus\nM’asomdwoe a manya yi\nEfiri asennua no so na 1bae1\nM’asomdwoe a manya yi\nEfiri asennua no so na 1bae1\n2. Wafa m’afodi no de k4\nasennua no so\nDe sesaa abrab4 pa de maa me\nWafa me nkoay1\nDe k4 asennua no so\nDe sesaa abrab4 pa de maa me\n3. Nneb4ney1fo a 1nn1, y1anya\nnkwagye yi\nEfiri asennua no so na 1bae1\n$soro kwan a abue,\nama y1n nn1 da yi\nEfiri asennua no so na 1bae1\nP AN 679 - Eunice Johnson"
  },
  {
    "id": "twi-168",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 168,
    "title": "ANKA nea mete no ware paa Anka nea mete no ware paa",
    "lyrics": "ANKA nea mete no ware paa\nAnka nea mete no ware paa\nYesu Ne d4, Ne dom, ne\nNe wu a Owui no\nAma me nso maba fie\nEunice Johnson"
  },
  {
    "id": "twi-169",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 169,
    "title": "MOGYA n’ atue emuk4 kwan ama y1n nso",
    "lyrics": "MOGYA n’ atue\nemuk4 kwan ama y1n nso\nama ahotefo y1anya kwan s4re no\nHalleluya! Halleluya!\nHalleluya nka Nyame\nAguammaa (2)\nEunice Johnson"
  },
  {
    "id": "twi-170",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 170,
    "title": "‘Nyame ne y1n w4 h4 ‘Nyame ne y1n w4 h4",
    "lyrics": "‘Nyame ne y1n w4 h4\n‘Nyame ne y1n w4 h4\n$tene Ne nsa ne ber1 mu\nMa tumi nyinaa br1 ase\nNa Ne nney1e nyinaa kyer1 s1\nNyame ne y1n w4 h4 nn1 nso\nNyame ne y1n w4 h4"
  },
  {
    "id": "twi-171",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 171,
    "title": "WAMA me nso mas1 nn1 Mogya dehye a $hwie gui w4",
    "lyrics": "WAMA me nso mas1 nn1\nMogya dehye a $hwie gui w4\nKalvary no nti (2)\nWama me koma at4 me yam\nMogya dehye no nti (2)\nMogya dehye, Mmo!\nMogya dehye, Mmo!\nWoama m’akoma at4 me yam\nMogya dehye, Mmo oo!\nEunice Johnson"
  },
  {
    "id": "twi-172",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 172,
    "title": "YUDA abusua kuo mu gyata no Wadi nkonim",
    "lyrics": "YUDA abusua kuo mu gyata no\nWadi nkonim\nKalvary $barima koko4durufo no\nWadi nkonim\nWako adi nkonim\n‘De asade ama ne mma\nGalilea ho4f1fo no\nWadi nkonim\nEunice Johnson"
  },
  {
    "id": "twi-173",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 173,
    "title": "W’AHENNI y1 daa ‘henni W’ahenni no fi tete",
    "lyrics": "1. W’AHENNI y1 daa ‘henni\nW’ahenni no fi tete;\nWofi tete dii hene,\nW’ahenni y1 daa ‘henni\n2. W’ahenni y1 daa ‘henni\nBra b1tena W’ahengua so;\nNa tumi nyinaa mmr1 ase\nW’ahenni y1 daa ‘henni\n3. W’ahenni y1 daa ‘henni\nW’ahenni no nni awiei;\n$soro hene ne wo ampa,\nW’ahenni y1 daa ‘henni\n4. W’ahenni y1 daa ‘henni\nHena na 4ne wo s1?\nMogya ‘dansefo hene\nW’ahenni y1 daa ‘henni\n5. W’ahenni y1 daa ‘henni\nAhene mu hene ne wo\nampa;\nWo nko na tumi w4 wo\nW’ahenni y1 daa ‘henni\n6. W’ahenni y1 daa ‘henni\nBra bedi ‘tamfo no so,\nAhotewfo hene Kristo\nW’ahenni y1 daa ‘henni\nApostolic Twi Dwom 253"
  },
  {
    "id": "twi-174",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 174,
    "title": "BURA bi w4 h4 b4gya ma W4twee n’ Immanuel mfem’",
    "lyrics": "1. BURA bi w4 h4 b4gya ma\nW4twee n’ Immanuel mfem’,\nNa ndzeb4ny1fo b4t4n a,\nW4yew h4n ho fi nyinaa\n2. Owifo no 4dze d1w hun\nBura n’ w4 n’aber do;\nH4 na kaansa mo ho y1\nnk4w a\nM’b4hor mo ho b4n nyinaa\n3. Nyame Eguambaa, Wo b4gyaa\nNo tum 4nnk1pa da,\nGyed1 W’as4rmba nyina enya\nnkwa\nMma w4nk1y1 b4n bio\n4. Ofitsi d1 me gyedzi hun\nEsu a ofi Wo mfem’\nOnyame d4 ay1 mo ndwom,\nNa 4b1y1 edu wum’\n5. Na owu ma me gyirame\nY1 komm da d1tsem’ a,\nMe kra b4tow ndwom d11d1w bi\nAkamfo Wo w4 sor\nCAN 61, William Cooper,\n1731-1800"
  },
  {
    "id": "twi-175",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 175,
    "title": "W4 Kalvary bep4w no so Wokum Kristo, Nyame ba no",
    "lyrics": "1. W4 Kalvary bep4w no so\nWokum Kristo, Nyame ba no,\n$y1 Yesu m’agyenkwa no.\n2. $br1 ne yaw hy11 Yesu so\nAsot4re ne mmaa atape\ngyee no,\n!maa m’agyenkwa no y11\nmmer1w\n3. Metee nte1te1m nne w4\ndua no so\nS1, me Nyame d1n nti na\nWoagyaw me,\n!y1 Yesu m’agyenkwa nne\n4. $de nne k1se te1m s1: “Mawie”\nNa $b44 ne ti ase na Owui\nO! hw1 s1nea Yesu si d4 me.\n5. Me wer1 remmfi Yesu\namanehunu,\nFi Getsemane kosi Kalvary,\nWered4m af4re a $b4e de\ngyee me\nApostolic Twi Dwom 144"
  },
  {
    "id": "twi-176",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 176,
    "title": "Ma Honhom kronkron mu ogya no mmra",
    "lyrics": "1. Ma Honhom kronkron mu\nogya no mmra\nNa soma y1n k4 wiase nyinaa,\nNa y1nk4b4 Wo ns1mpa no\ndawur’\nNkyer1 w4n a wohia\nnkwagye nyinaa\nChorus\nMa ogya no mmra, ma\nogya no mmra\nMa Honhom kronkron mu\nogya no mmra, ma ogya\nno mmra,\nMa Honhom kronkron mu\nogya no mmra\n2. Ma Honhom kronkron mu\nogya no mmra\nNa bebubu ‘tamfo bonsam\nmpokyer1\nB1gye wo nkor4fo fi ’wu\nahama mu\nMa Honhom kronkron mu\nogya no mmra\n3. Ma Honhom kronkron mu\nOgya no mmra\nAwurde b1y1 w’ara w’aduma;\n$tamfo bonsam ama nabaa so,\nMa Honhom kronkron mu\nogya no mmra\n4. Ma Honhom kronkron mu\nogya no mmra\nY1gye w’as1mpa mu tumi\nno di;\nMa Pentekoste da ogya no\nmmra\nMa Honhom kronkron mu\nogya no mmra\n5. Ma Honhom kronkron mu\nogya no mmra\nAwurade ma W’adom nsu\nno nt4\nMa Honhom kronkron mu\nogya no mmra\nMa Honhom kronkron mu\nogya no mmra\nApostolic Twi Dwom 157"
  },
  {
    "id": "twi-177",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 177,
    "title": "Akwantu bi w4 ho a yebetu !ny1 wiase ha akwantu no bi",
    "lyrics": "1. Akwantu bi w4 ho a yebetu\n!ny1 wiase ha akwantu no bi,\nSoro h4 akwantu na\ny1retw1n,\nAnigye b1n na saa da no b1y1\n2. S1 sum hy1 kabii ma\n$pranaa bobom,\nMa Kristo mu awufo s4re\nkan’ a\nNa s1 y1ne w4n bom\nk4hyia Kristo a,\nAnigye b1n na saa da no b1y1\n3. Anigye na y1de betu kwan no,\nAhurisi na y1de behyia\nKristo\nGyidifo nyinaa b1bom\nanantew,\nAnigye b1n na saa da no b1y1\n4. Y1behu y1n ho anim ne anim\nBere a yebehyia w4 ahengua\nno anim,\nNa s1 ahotewfo nyinaa bom\ntra a,\nAnigye b1n na saa da no b1y1\n5. Y1w4 dwom foforo bi a\ny1b1to,\nSoro ab4fo mpo renntumi\nnnte ase\nY1n nkunimdi ho dwom na\ny1b1to,\nAnigye b1n na saa da no b1y1\nApostolic Twi Dwom 308"
  },
  {
    "id": "twi-178",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 178,
    "title": "Getsemane turo mu h4 Awer1how t44 Yesu so",
    "lyrics": "1. Getsemane turo mu h4\nAwer1how t44 Yesu so;\nH4 na $kyer11 ne d4 no\nS1 $d4 me deb4ney1ni\nChorus\n$d4 b1n ni? anwanwa d4\nS1 $d4 me mmroso saa yi,\nO, anka me nso mad4 No.\n2. Owu adesoa t44 me so,\nYesu bae ma made me ho;\nOyii me fii owus1e mu,\nDe kyer11 ne d4 a $d4 me\n3. Meb44 musu yeraa me kra,\nNa Yesu bae b1hwehw11 me\n$t44 mum’ ne twitwafo anim,\nDe gyee me san baa nkwa\nmu bio\nApostolic Twi Dwom 123"
  },
  {
    "id": "twi-179",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 179,
    "title": "OGUAMMAA s1 ay1yi Oguammaa s1 nnaase",
    "lyrics": "1. OGUAMMAA s1 ay1yi\nOguammaa s1 nnaase,\nMomfa mo ho nyinaa mma no,\n$no na $s1 ay1yi\n2. Oguammaa s1 ay1yi\nNe nko na $s1 ay1yi\nN’af4re a 4b4e no nti\n$no na $s1 ay1yi\n3. Oguammaa s1 ay1yi\nMunyi no ay1 daa,\nNe wu no apata ama y1n\n$no na $s1 ay1yi\n4. Oguammaa s1 ay1yi\nMonto n’ay1yi dwom\nNe dom nti momma y1nka\n$no na $s1 ay1yi s1,\n5. Oguammaa s1 ay1yi\nAmpa 4s1 ay1yi\n$no ne y1n nkwagye botan\nNe nko na $s1 ay1yi\nApostolic Twi Dwom 202"
  },
  {
    "id": "twi-180",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 180,
    "title": "O Yesu d4fo pa Wo nkor4fo w4 w’anim",
    "lyrics": "1. O Yesu d4fo pa\nWo nkor4fo w4 w’anim;\nMa w’ad4e no nso y1n so,\nNa w’anuonyam nna adi\n2. Obi nni h4 s1 wo\nYesu $d4fo pa;\nMa w’ad4e no nso y1n so\nNa w’anuonyam nna adi\n3. Ampa y1hw1 wo kwan,\nMa adom kwan mmue\nmma y1n;\nMa w’ad4e no nso y1n so,\nNa w’anuonyam nna adi\n4. Woy1 mm4bor4hunufo,\n!nte saa a’nka y1nyera;\nMa w’ad4e no nso y1n so,\nNa w’anuonyam nna adi\nApostolic Twi Dwom 283"
  },
  {
    "id": "twi-181",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 181,
    "title": "YESU Kristo y1 agyenkwa, Nhyira nka no",
    "lyrics": "1. YESU Kristo y1 agyenkwa,\nNhyira nka no\nW’ama y’ahu ne nkwagye,\nNhyira, nhyira nka no.\n2. Kristo mogya y1 nkwa nsu,\nNhyira nka no\nWama y’anom nsu no bi,\nNhyira, nhyira nka no.\n3. Nea $s1n dua no so,\nNhyira nka no\nWama y’anom nsu no bi,\nNhyira, nhyira nka no.\n4. Yesu Kristo wu no nti,\nNhyira nka no,\nNe mogya mu wu no nti,\nNhyira, nhyira nka no.\n5. Yesu Kristo adom nti,\nNhyira nka no,\nNe wus4re tumi nka no.\n5. Yesu Kristo, med4 wo,\nNhyira nka no,\nWo na wodii kan d44 me,\nNhyira, nhyira nka no.\nApostolic Twi Dwom 218"
  },
  {
    "id": "twi-182",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 182,
    "title": "YESU, Kristo as4re Was4re, 4renwu bio",
    "lyrics": "1. YESU, Kristo as4re\nWas4re, 4renwu bio;\nOwu, wo tumi w4 he?\nWas4re, Hallelu Ya!\n2. Was4re, Was4re nn1\nMonte1m denden s1 Was4re\nOwu, wo nwow4e w4 he?\nWas4re, Hallelu Ya!\n3. $ma ‘nifuraefo hu ade\n$ma ‘kwatafo ho fi\n$ma mmubuafo nante\nWas4re, Hallelu Ya!\n4. Anigye w4 soro h4,\nAsomdwoe w4 asase so,\nAnis4 w4 nnipa mu\nWas4re, Hallelu Ya!\n5. $de nnommum k44\nnnommum m’\n$de aky1de maa nnipa\nOwu tumi no w4 he?\nWas4re, Hallelu Ya!\n6. S1 y1te Kristo din a,\nNkotodwe nyinaa ngu fam,\nNa t1kr1ma mpaem’ nka s1\nWas4re, Hallelu Ya!\nP AN 492"
  },
  {
    "id": "twi-183",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 183,
    "title": "$d4fo a woada, $d4fo a woada",
    "lyrics": "$d4fo a woada,\n$d4fo a woada,\nWo nna yi ase ne s1n\nS4re na Kristo’ b1hyer1n wo so;\n$de N’anuonyam no reba\nTumi a 4de reba!\nTumi a 4de reba!\nWiase mmusuakuw nyinaa\nW4de w4n ano b1tom asu\nP AN 420"
  },
  {
    "id": "twi-184",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 184,
    "title": "$dzeb4ny1nyi nni enyimnyam W4 ahengua n’enyim",
    "lyrics": "$dzeb4ny1nyi nni enyimnyam\nW4 ahengua n’enyim;\nEguamba n’dze b4gya dehye\nb4t4 aky1 m’\nAma mo so maasoa nkwa\nahenky1w\nP AN (Mfantse) 516\nEunice Addison"
  },
  {
    "id": "twi-185",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 185,
    "title": "NYAME ayi Ne d4 adi W4awo Agyenkwa ama y1n",
    "lyrics": "1. NYAME ayi Ne d4 adi\nW4awo Agyenkwa ama y1n\n$de N’ aky1 y1n;\n$de N’ aky1 y1n;\n2. Mm4bor4hunufo ne $domfo\nNe Yehowa\n$de N’ aky1 y1n;\n$de N’ aky1 y1n;\n3. Wab1popa y1n mmarato\nnyinaa\nNa y1n kra anya nkwagye\n$de N’ aky1 y1n;\n$de N’ aky1 y1n;\n4. Y1ne odwontofo b1to\nAyeyi nnwom\nNa y1n nyinaa aka s1\nHallelu Ya!\nP AN 626\nEunice Addison"
  },
  {
    "id": "twi-186",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 186,
    "title": "Oduy1fo k1se n’ab1n $nye tsimb4b4r Jesus",
    "lyrics": "1. Oduy1fo k1se n’ab1n\n$nye tsimb4b4r Jesus\n$kasa ma akoma at4 yam’\nD4fo, tsie Jesus Ne ndze!\nChorus\nNdwom bi a 4y1 d1w w4\nsor,\nDzin bi a 4y1 d1w w4 ase,\nEnigye ndwom a 4w4 beebi\nJesus, siarfo Jesus\n2. W4dze wo b4n nyinaa aky1 w’\nD4fo, tsie Jesus Ne dzin!\nFa asomdwee tu wo kwan\nk4 sor\nK1nye Jesus nsoam ahenky1w\n3. Enyimnyam nka Nyame\nEguambaa!\nMegye Jesus Ne dzin dzi;\nMod4 Gyefo siarfo ne dzin,\nMod4 me Jesus Ne dzin.\n4. Ne dzin pa m’af4dzi nyina,\nDzin bi nnyi h4 d1 Jesus!\nMe kra dze enyigye dze tsie\nJesus dzin a 4som bo n’\n5. Nuanom, hom ngya m’\nMinyi N’ ay1w\nHom nyi Jesus dzin ay1w\nNkyer1baa hom so mma\nhom ndze do\nHom nhyira me Jesus Ne\ndzin.\nCAN 103, William Hunter"
  },
  {
    "id": "twi-187",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 187,
    "title": "Nyame ye, Onyame ye daa, Wama ade akye y1n bio",
    "lyrics": "1. Nyame ye, Onyame ye daa,\nWama ade akye y1n bio\nMomma y1nto dwom\nnkamfo no\nNyame ye, Onyame ye daa.\n2. Nyame ye, Onyame ye daa,\nWankum y1n, wanntwa\ny1n antwene\n$de ne d4 akora y1n so\n‘Ma y1da so y1te nkwa m’ bio"
  },
  {
    "id": "twi-188",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 188,
    "title": "$b1n me ky1n m’adamfo Saa na Yesu te",
    "lyrics": "$b1n me ky1n m’adamfo\nSaa na Yesu te\n$y1 M’adamfo pa,\nAde nyinaa mu\n$y1 me botantim\nMe ky1m ne me guank4bea\n$b1n me ky1n m’adamfo\nSaa na Yesu te."
  },
  {
    "id": "twi-189",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 189,
    "title": "Nyame d4 ne mma Na $yi w4n firi w4n haw mu (2)",
    "lyrics": "Nyame d4 ne mma\nNa $yi w4n firi w4n haw mu (2)\nMmer1 a wapa aba\nAnidaso nyinaa asa\nYehowa b1hw1\nS1 nkwagye tumi bi w4 h4"
  },
  {
    "id": "twi-190",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 190,
    "title": "AWURADE siesie wo somfo Ma adwumapa a wahyehy1",
    "lyrics": "1. AWURADE siesie wo somfo\nMa adwumapa a wahyehy1\nChorus\nMa meny1 adwinnade1 a\nWode b1y1 biribi pa\nAma W’adwuma ak4 so\n2. Awurade siesie wo somfo\nSra me ngo ma meny1\nfoforo.\n3. Ma meny1 $bo a nkwa wo m’\nA wode besi dan papa\n4. S1 wohia 4somfo pa\nAma adwuma papa yi a\n5. W4n a w4y1 adwumade pa\nW4 akatua w4 wo nsam\n6. Adwuma pa Wura Yesu\nS1 wohia adwinnade a\nChorus\nFa me y1 adwinnade a,\nWode b1y1 biribi pa\nAma W’adwuma ak4 so\nEunice Addison"
  },
  {
    "id": "twi-191",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 191,
    "title": "Mehwehw1 Wo, Yesu nko Mehwehw1 Wo, Yesu nko",
    "lyrics": "Mehwehw1 Wo, Yesu nko\nMehwehw1 Wo, Yesu nko\nNa woatwer1 s1 “Nkwa nsu\nB1sen afiri wo yam” (2)\nPAN 975"
  },
  {
    "id": "twi-192",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 192,
    "title": "Onua pa, bra fie Wiadze nd1mba botwa m’ ak4",
    "lyrics": "Onua pa, bra fie\nWiadze nd1mba botwa m’ ak4\nSika botwa m’ ak4\nMe Nyame w4 h4 daa (2)\nP AN 333 (Mfantse)"
  },
  {
    "id": "twi-193",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 193,
    "title": "O hwie ngo fofor gu me kra mu Ma dza wawu nyinaa nya",
    "lyrics": "O hwie ngo fofor gu me kra mu\nMa dza wawu nyinaa nya\nnkwa bio\nWaawaa m’ani so ab4n ma\nmenhu $hen’ no\nS4 ogya w4 me kra mu (2)\nChorus\nOgya e! Ogya\nSunsum kronkron ne Ogya (x2)\nB1y1 W’adwuma\nB1y1 W’adwuma m’akoma mu o!\nOgya e! Onyame Gya\nEunice Addison"
  },
  {
    "id": "twi-194",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 194,
    "title": "An4pa bi reba B4ne su nyinaa ara b1twam",
    "lyrics": "An4pa bi reba\nB4ne su nyinaa ara b1twam\nAn4pa bi reba (2)\nY1behu Jesus N’anim"
  },
  {
    "id": "twi-195",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 195,
    "title": "Wo koma te1, s1 me koma te? W’adwene y1 p1 s1 m’adwene",
    "lyrics": "Wo koma te1, s1 me koma te?\nW’adwene y1 p1 s1 m’adwene\ny1 p1?\nFa wo nsa ma me na foro bra\nB1tena tease1nam no mu\nna y1nk4y1 Nyame adwuma\nPAN 427"
  },
  {
    "id": "twi-196",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 196,
    "title": "SUM nni h4 bio, sum nni h4 bio Hallelu Ya! Sum nni h4 bio",
    "lyrics": "SUM nni h4 bio, sum nni h4 bio\nHallelu Ya! Sum nni h4 bio\nEfis1 Yesu y1 hann, 4y1 w4\nsoro h4\nHallelu Ya! Sum nni h4 bio\nP AN 616"
  },
  {
    "id": "twi-197",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 197,
    "title": "Hwim me k4 4soro daa nyinaa Hwim me k4 4soro daa nyinaa",
    "lyrics": "Hwim me k4 4soro daa nyinaa\nHwim me k4 4soro daa nyinaa\nHwim me k4 4soro daa nyinaa,\nAwurade\nHwim me k4 4soro daa nyinaa\nWiase nne1ma nyinaa ara y1\nkwa\nAsase nne1ma nyinaa ara y1\nhunu\nHwim me k4 4soro daa nyinaa,\nAwurade\nHwim me k4 4soro daa nyinaa\nP AN 815\nElder Kissiedu"
  },
  {
    "id": "twi-198",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 198,
    "title": "Onyame w4 h4 oo! Hwehw1 N’ na ebohu N’ (2)",
    "lyrics": "Onyame w4 h4 oo!\nHwehw1 N’ na ebohu N’ (2)\nP AN 332 (Mfantse)"
  },
  {
    "id": "twi-199",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 199,
    "title": "Osiand1 Owui maa h1n $dze Ne b4gyaa at4 h1n",
    "lyrics": "Osiand1 Owui maa h1n\n$dze Ne b4gyaa at4 h1n\nJesus N’enyimyam b1hyer1n\nh1n do daa\nW4 kurow fofor no mu\nP AN 34 (Nfantse)"
  },
  {
    "id": "twi-200",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 200,
    "title": "$sor nsanku reb4 ay1yi? (2) $sor nsanku aka abom, reb4",
    "lyrics": "1. $sor nsanku reb4 ay1yi? (2)\n$sor nsanku aka abom, reb4\nAy1yi! Ay1yi!\n2. $sor’ ad4ma rewoso ay1yi? (2)\n$sor ad4ma aka abom rewoso\nAy1yi! Ay1yi!\n3. Ana w’akoma reto ay1yi? (2)\nAna w’akoma aka abom\nreto\nAy1yi! Ay1yi!\n4. !me m’akoma reto ay1yi (2)\n!me m’akoma aka abom reto\nAy1yi! Ay1yi!\nP AN 35 (Mfantse)"
  },
  {
    "id": "twi-201",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 201,
    "title": "Bra b1hw1 Jesus N’aho4f1 Bra b1hw1 aho4f1 f11f1",
    "lyrics": "Bra b1hw1 Jesus N’aho4f1\nBra b1hw1 aho4f1 f11f1\nBra b1hw1 aho4f1 a 1nni ewiei\nBra b1hw1 aho4f1 mmoroso\nAdom bi w4 ne mu o, bra b1hw1\nNkwa bi w4 ne mu o, abu so\nAdom bi w4 ne mu o, abu so\nAdom bi w4 ne mu o, Bra b1hw1\nP AN 317 (Mfantse)"
  },
  {
    "id": "twi-202",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 202,
    "title": "Adekyee f11f1, f11f1 f11f1 bi reba",
    "lyrics": "Adekyee f11f1, f11f1 f11f1 bi reba\n!reba nt1m, 1reba nt1m\nOwia b1hyer1n, ahyer1n, atu\nsum nyinaa\nNt1mnt1m, Nt1mnt1m,\nW4b1boa y1n nyinaa ano,\nAk4hyia asuogya h4\nY1n ahokyere ne y1n ns4hw1\nNyinaa b1k4 1remma bio\nAdekyee f11f1, f11f1 f11f1 bi reba\n!reba nt1m, yiw nt1m\nP AN 304 (Mfantse)"
  },
  {
    "id": "twi-203",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 203,
    "title": "Mma nnwen’ ntra so Onipa kae s1 woy1 d4te (2)",
    "lyrics": "Mma nnwen’ ntra so\nOnipa kae s1 woy1 d4te (2)\nP AN 312 (Mfantse)"
  },
  {
    "id": "twi-204",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 204,
    "title": "Daakye, daakye, daakye S1 mede animguase nnipadua",
    "lyrics": "Daakye, daakye, daakye\nS1 mede animguase nnipadua\nTo h4 a, m1k4 anuonyam bea\nP AN 308 (Mfantse)"
  },
  {
    "id": "twi-205",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 205,
    "title": "B4gya, Jesus b4gya B4gya, a 4tsew mekra ho (2)",
    "lyrics": "B4gya, Jesus b4gya\nB4gya, a 4tsew mekra ho (2)\nB4gya, B4gya, B4gya, B4gya,\nB4gya, Jesus B4gya\nB4gya, B4gya, B4gya, B4gya,\nB4gya, B4gya kr4nkr4n\nP ANF 566"
  },
  {
    "id": "twi-206",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 206,
    "title": "Y!DZE enyimnyam b1ma Jesus",
    "lyrics": "Y!DZE enyimnyam b1ma\nJesus,\nNa y1aka No d4 no, na y1aka\nNo d4 no\nY1dze enyimnyam b1ma Jesus,\nNa y1aka No d4 n’ho\nawanwas1m\nP ANF 66"
  },
  {
    "id": "twi-207",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 207,
    "title": "Y!RETUTU y1n anan s1nea akwantufo retu o!",
    "lyrics": "Y!RETUTU y1n anan s1nea\nakwantufo retu o!\nYeretutu y1n anan s1nea\nakwantufo retu o!\nY1asi so rek4 Zion\nZion kuro f1f1 no mu;\n!h4 na y1b1tra daa daa\nYeretutu y1n anan s1nea\nakwantufo retu o!\nP ANT 939 (Mfantse)"
  },
  {
    "id": "twi-208",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 208,
    "title": "JESUS, Jesus Konyim ndwom na y1b4tow",
    "lyrics": "JESUS, Jesus\nKonyim ndwom na y1b4tow\nAo Jesus w4ak’r4n No (2)\nW4akr4n No, aman m’b4hw1\nEunice Addison, P ANF 67"
  },
  {
    "id": "twi-209",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 209,
    "title": "WO HO 4k4m dze me kra Wo ho nsuk4m dze me kra",
    "lyrics": "WO HO 4k4m dze me kra\nWo ho nsuk4m dze me kra;\nJesus, Onyame Ne ba\nBra b1tsena m’akoma m’ ma\nmemee\nP ANF 483"
  },
  {
    "id": "twi-210",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 210,
    "title": "KONYIMDZI w4 h4 ma h4n a w4twer Jesus",
    "lyrics": "KONYIMDZI w4 h4 ma h4n a\nw4twer Jesus,\nNa No Bogya nye h4n akoky1m\nN’as1m no y1 egyapadze k1se\nma h4n\nNa N’adom no bu do ma h4n\ndaa\nW4mb4 mu ntow ay1yi ndwom\nmma No daa,\n‘B1n ay1yi ndwom na 4s1 No?\nY1b4tow, y1b4tow\nAlleluia ndwom na y1b4tow\nP ANF 77"
  },
  {
    "id": "twi-211",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 211,
    "title": "NA w4too Onyankop4n akoa Mose dwom",
    "lyrics": "NA w4too Onyankop4n akoa\nMose dwom\nNe oguamma No dwom s1:\nAwurade Nyankop4n\nAde nyinaa so tumfo, Wo\nnnwuma y1 ak1se\nNa 1y1 nwonwa.\nMerensanten Hene, W’akwan\ntene\nMerensanten Hene, W’akwan\ntene\nMerensanten Hene, W’akwan\ntene\nNa 1y1 nwonwa\nP ANT 331"
  },
  {
    "id": "twi-212",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 212,
    "title": "$W$ d1 obiara d4 No; Obiara w4 mbea nyinaa",
    "lyrics": "$W$ d1 obiara d4 No;\nObiara w4 mbea nyinaa\n$w4 d1 obiara d4 No;\n$b1pam wo dadwen nyinaa\n$no n’ $y1 nkwagye far’baa;\n$soa w’af4dzi nyina\nJesus wui maa aman nyinaa\nObiara w4 mbea nyinaa\nP ANT 97"
  },
  {
    "id": "twi-213",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 213,
    "title": "NYAN me o, me Nyame e! Nyame me, m’Agyenkwa e!",
    "lyrics": "NYAN me o, me Nyame e!\nNyame me, m’Agyenkwa e!\nAmma m’annda owu nda\nChristian n’enyi da h4 daa\nNyan me o, me Nyame e!\nP ANF 131"
  },
  {
    "id": "twi-214",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 214,
    "title": "Yesu hw1 m’ wo nan ase Wo mogya nko na ebetumi",
    "lyrics": "Yesu hw1 m’ wo nan ase\nWo mogya nko na ebetumi\nagye m’\nWo na wonim m’ahiade\nWo mogya nko na ebetumi\nagye m’\nChorus\nO! O! minni hwee de reba\nGyidi na mede tetare wo\nO, mmeam’dua Nyame Aguammaa\nWo mogya nko na ebetumi agye m’\nP ANF 557"
  },
  {
    "id": "twi-215",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 215,
    "title": "CALVARY na m’Agyenkwa n’wui",
    "lyrics": "CALVARY na m’Agyenkwa\nn’wui\n!h4 na menya me nkwagye (2)\n!h4 na $tseaam “Eli, Eli”\n!h4 na menya me nkwagye (2)\nP ANT 456"
  },
  {
    "id": "twi-216",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 216,
    "title": "OWUI ma meenya nkwa; (2) M’ay1yi b4for’ ak4 No h4",
    "lyrics": "OWUI ma meenya nkwa; (2)\nM’ay1yi b4for’ ak4 No h4\nNyia Owui ma meenya nkwa n’\nP AN F37, Eunice Addison"
  },
  {
    "id": "twi-217",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 217,
    "title": "S1e n’, s1e n’, s1e n’ Onyame nipa s1e",
    "lyrics": "S1e n’, s1e n’, s1e n’ Onyame\nnipa s1e\nS1e $tamfo n’ n’adwuma (2)\nMama wo tumi s1 k4s1e\nn’adwuma\nMama wo tumi s1 k4ka\nM’as1mpa\nMeka wo ho na mma nsuro\nAo k4, k4di nkonim\nP ANF 1158, Eunice Addison"
  },
  {
    "id": "twi-218",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 218,
    "title": "BER a wi da do yi, mframa rob4 yi",
    "lyrics": "BER a wi da do yi, mframa\nrob4 yi\nAna mow4 biribi a medze b1ma\nEwuradze?\nBer a Christ agye mo nkwa yi,\nM’ahom aaka mo ho\nMedze mo ho nyina b1ma No\nP ANF 25"
  },
  {
    "id": "twi-219",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 219,
    "title": "EGUAMBAA N’a wokum no n’ Eguambaa N’ a wokum no n’",
    "lyrics": "EGUAMBAA N’a wokum no n’\nEguambaa N’ a wokum no n’\nEguambaa N’ a wokum no n’\n$fata\nHom nyi N’ay1w, Alleluia (3)\nHom nyi N’ay1w\nP ANF 40"
  },
  {
    "id": "twi-220",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 220,
    "title": "O MO Wura, meda Wo ase (2) O dza ay1 ama m’ 4d44 so’",
    "lyrics": "O MO Wura, meda Wo ase (2)\nO dza ay1 ama m’ 4d44 so’\nMedze ay1yi af4r mede br1 Wo\nP AN F37, Eunice Addison"
  },
  {
    "id": "twi-221",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 221,
    "title": "KR$NKR$N! kr4nkr4n! kr4nkr4n!",
    "lyrics": "KR$NKR$N! kr4nkr4n!\nkr4nkr4n!\nD4m Ewradze Nyankop4n\nWo na Sor ab4fo nyinaa kotow\nWo,\nWo na ahotsewfo nyinaa kotow\nWo\nP ANF 58"
  },
  {
    "id": "twi-222",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 222,
    "title": "METSE Ne nka m’akoma mu (3) Metse ne nka aber nyina",
    "lyrics": "METSE Ne nka m’akoma mu (3)\nMetse ne nka aber nyina\nP ANF 122"
  },
  {
    "id": "twi-223",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 223,
    "title": "MBEAMUDUA n’ ase, m’b4k4 h4 Mbeamudua n’ase m’b4k4 h4",
    "lyrics": "MBEAMUDUA n’ ase, m’b4k4 h4\nMbeamudua n’ase m’b4k4 h4\nMbr1 Jesus bowui gyee me\nnkwa\nMbeamudua n’ase m’b4k4 h4\nP ANF 125"
  },
  {
    "id": "twi-224",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 224,
    "title": "ME mpokyer1 nyina ebubu(4) Mehu m’Agyenkwa",
    "lyrics": "ME mpokyer1 nyina ebubu(4)\nMehu m’Agyenkwa\nM’Agyenkwa nwanwanyi,\n$som me bo\nMe mpokyer1 nyina ebubu\nP ANF 132"
  },
  {
    "id": "twi-225",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 225,
    "title": "MENYA ny1nko, ny1nko a $mmpa da",
    "lyrics": "MENYA ny1nko, ny1nko a\n$mmpa da\nMenya mo ho, sunsum mu\nahonya\nMeny1 akoa mma b4n bio\nNa osiand1 Christ ahor me.\nP ANF 138"
  },
  {
    "id": "twi-226",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 226,
    "title": "Y!DZE ay1yi ndwom ara, (2) Y1dze ay1yi ndwom b1ka",
    "lyrics": "Y!DZE ay1yi ndwom ara, (2)\nY1dze ay1yi ndwom b1ka\n4tamfo egu daadze\nP ANF 142"
  },
  {
    "id": "twi-227",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 227,
    "title": "D!W d1w ahy1 m’akoma ma (2) M’Agyenkwa b1n me aber nyinaa",
    "lyrics": "D!W d1w ahy1 m’akoma ma (2)\nM’Agyenkwa b1n me aber nyinaa\nD1m ntsi na d1w ahy1\nm’akoma ma\nP ANF 147"
  },
  {
    "id": "twi-228",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 228,
    "title": "DZI d1w, 4kofo dzi d1w, Dzi d1w, mma nnsan w’akyir",
    "lyrics": "DZI d1w, 4kofo dzi d1w,\nDzi d1w, mma nnsan w’akyir\nK4 w’enyim na konyim no reba\nDzi d1w, 4kofo, dzi d1w.\nP ANF 175"
  },
  {
    "id": "twi-229",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 229,
    "title": "AMANSAN Nyame Wo na adom ahy1 Wo ma",
    "lyrics": "AMANSAN Nyame\nWo na adom ahy1 Wo ma;\nTwereduamp4n, y1dan Wo\nAkwan nyinaa mu.\nP ANF 576"
  },
  {
    "id": "twi-230",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 230,
    "title": "HY! dzen na mma nsuro Hy1 dzen wo Jesus mu",
    "lyrics": "1. HY! dzen na mma nsuro\nHy1 dzen wo Jesus mu,\nWo Nyame a esom no daa n’\n$no na $b1gye wo. (2)\n2. K4 han na mma nnsuro\nK4 kan w4 Jesus mu,\nWo Nyame a esom no daa\ndaa n’\n$no na $b1gye wo. (2)\n3. Hom do na mma nsuro\nHom do w4 Jesus mu,\nWo Nyame a egye N’dzi\ndaa daa n’\n$no na $betsie w’ su\n4. Twer no na mma nnsuro\nTwer No w4 Jesus mu\nWo Nyame a egye N’dzi\ndaa daa n’\n$no na $b1gye wo.\nP ANF 181"
  },
  {
    "id": "twi-231",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 231,
    "title": "TSENA M’as1m mu, fa wo ho ma M",
    "lyrics": "TSENA M’as1m mu, fa wo ho\nma M\nM’b1y1 wo dehye M’b1y1 wo\n‘dehye\nAhyemu dadaw n’k4, ahyemu\nforfor aba;\nMenye Me nkor4fo b1tsena\nakoma mu (2)\nP ANF 192, Eunice Addison"
  },
  {
    "id": "twi-232",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 232,
    "title": "ABRAHAM, Sarah, w4de ba b44 h4n anohoba",
    "lyrics": "ABRAHAM, Sarah, w4de ba\nb44 h4n anohoba\n$y11 h4 nwanwa, wonnhu dza\nw4nka;\nWonyin d1 dza Nyame aka\nbiara $botum ay1\nNa nd1 so Nyame tum no, 4tse\nd1mara.\nNa nd1 so Nyame no tum no,\n4tse d1mara\nDza nkor4fo b1ka biara, 4mmfa\nho\nWonyim d1 dza Nyame aka\nbiara, $botum ay1\nNa nd1 so Nyame tum no, 4tse\nd1mara.\nP ANF 202"
  },
  {
    "id": "twi-233",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 233,
    "title": "Y!NAM kwan no mu, nokwar kwan no omu",
    "lyrics": "Y!NAM kwan no mu, nokwar\nkwan no omu\nY1rennsan h1n ekyir ara da\nYesi nkrum mpo ara a Jesus\nka h1n ho\nY1nam nokwar kwan no mu\nP ANF 213"
  },
  {
    "id": "twi-234",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 234,
    "title": "N’ENYIMNYAM b1hyer1n h1n do",
    "lyrics": "N’ENYIMNYAM b1hyer1n h1n\ndo\nDaa nyinaa, beebiara (2)\nP ANF 214"
  },
  {
    "id": "twi-235",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 235,
    "title": "$NNSO Nyame y1, 4nnso Nyame y1",
    "lyrics": "$NNSO Nyame y1, 4nnso\nNyame y1\n$nnso Nyame y1; s1 egyedzi\ndza\nP ANF 217"
  },
  {
    "id": "twi-236",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 236,
    "title": "W’ADWUMA yi ho asodi da me so",
    "lyrics": "W’ADWUMA yi ho asodi da\nme so\nAwurade ma me ho aho4den (x2)\nWoabu me bi na W’afr1 me\naba wo twa adwuma yi mu.\nNyame Aguamma, $boafo pa\nKa me ho aber1 nyinaa."
  },
  {
    "id": "twi-237",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 237,
    "title": "$TSE ase, Oenyan efi ewufo m’ $aso1r d1 mbr1 $kaa n’",
    "lyrics": "$TSE ase, Oenyan efi ewufo m’\n$aso1r d1 mbr1 $kaa n’\nW4nka N’ekyir ns1mpa\n$ama h1n nkwa a no tun\nrunntwa da\nAlleluia! $tse ase.\nP ANF 244"
  },
  {
    "id": "twi-238",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 238,
    "title": "O B$GYA, b4gya kr4nkr4n O b4gya, b4gya dehye",
    "lyrics": "O B$GYA, b4gya kr4nkr4n\nO b4gya, b4gya dehye\nO b4gya, na $agye me nkwa\nEnyimnyam nka Nyame\nEguamba\nP ANF 260"
  },
  {
    "id": "twi-239",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 239,
    "title": "S1 y1tsew t4 No b4gyaa no mua $b4hor h1n ho fi nyina",
    "lyrics": "S1 y1tsew t4 No b4gyaa no mua\n$b4hor h1n ho fi nyina\nEnyimnyam nka Eguambaa a\n$ay1 adze nyina yie\nP AN F 261, Eunice Addison"
  },
  {
    "id": "twi-240",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 240,
    "title": "NA w4awo $ba ama y1n; W4ama y1n $ba banin",
    "lyrics": "NA w4awo $ba ama y1n;\nW4ama y1n $ba banin\nNa w4awo $ba ama y1n;\nN’ahenni b1da Ne mmati so,\nNa w4b1fr1 Ne din;\n$pamfo nwonwani, Onyame\nKatakyi\n$domankoma Agya, Asomdwoe\nHene\n$domankoma Agya,  Asomdwoe\nHene\nP AN F 234"
  },
  {
    "id": "twi-241",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 241,
    "title": "JESUS B4gya repram (2) Jesus b4gya repram b4n do",
    "lyrics": "JESUS B4gya repram (2)\nJesus b4gya repram b4n do\n$refa wiadze ndomum ak1ma\nJesus\nJesus b4gya edzi nyim\nP AN F 271, Eunice Addison"
  },
  {
    "id": "twi-242",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 242,
    "title": "B$GYA a ofi Ne mfe m’ $dze nkwa abr1 me nye wo",
    "lyrics": "B$GYA a ofi Ne mfe m’\n$dze nkwa abr1 me nye wo\nAgyenkwa b4gya a ofi Ne\nmfem’ repem\n$dze nkwa abr1 me nye wo.\nP AN F 278, Eunice Addison"
  },
  {
    "id": "twi-243",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 243,
    "title": "Kwasida, mew4 anigye, Dwowda, d1w ahy1 me ma",
    "lyrics": "Kwasida, mew4 anigye,\nDwowda, d1w ahy1 me ma\nBenada mew4 asomdwoe\nbribiara ntumi ns1e no;\nWukuda 1ne Yawda,\nmenantew w4 hann mu;\nFida soro aba fam;\nMemeneda, animtew da\nChorus\nAnuonyam, anuonyam,\nanuonyam\nAnuonyam, nka Oguamba n’\nO Hallelu Ya! Manya nkwa.\nM’ani gye s1 manya nkwa\nAnuonyam, anuonyam,\nanuonyam\nAnuonyam, nka Oguamba n’\nO Hallelu Ya! Manya nkwa.\nMerek4 soro fie\nOn Sunday I am happy\nP ANT Hymn 238"
  },
  {
    "id": "twi-244",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 244,
    "title": "$BAE begyee m’ nkwa $bae besaa m’yar",
    "lyrics": "$BAE begyee m’ nkwa\n$bae besaa m’yar\n$bae dze no tum ab1hy1 m’ma\nHom nyi N’ay1w, $resan aba\nbio\nAb1fa h1n ak4 afeb44\nP AN F 286"
  },
  {
    "id": "twi-245",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 245,
    "title": "Y!ROK$ kuro fofor no mu (2) Nyame ‘Guamba nye h1n",
    "lyrics": "Y!ROK$ kuro fofor no mu (2)\nNyame ‘Guamba nye h1n\nkwankyer1fo\nOdze h1n bodu kurow no mu.\nPAN F 287"
  },
  {
    "id": "twi-246",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 246,
    "title": "Obesi m’ yie, obesi m’ yie Obesi m’ yie da bi",
    "lyrics": "1. Obesi m’ yie, obesi m’ yie\nObesi m’ yie da bi\nMesi no pi w4 m’akoma mu\nObesi m’ yie da bi\n2. M’bodu me fie, m’bodu me\nfie\nM’bodu me fie, da bi\nMesi no pi w4 m’akoma mu\nM’bodu me fie, da bi\n3. M’b4hu N’enyim, m’b4hu\nN’enyim\nM’b4hu N’enyim, da bi\nMesi no pi w4 m’akoma mu\nM’b4hu N’enyim, da bi\n4. M’b4soa ahenky1w, M’b4soa\nahenky1w,\nM’b4soa ahenky1w, da bi\nMesi no pi w4 m’akoma mu\nM’b4soa ahenky1w, da bi\n5. Morok4 ak4hom, Morok4\nak4hom\nMorok4 ak4hom da bi\nMesi no pi w4 m’akoma mu\nMorok4 ak4hom da bi\nP AN F 305"
  },
  {
    "id": "twi-247",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 247,
    "title": "FA WO nkwa b4 af4r ma Nyame",
    "lyrics": "FA WO nkwa b4 af4r ma\nNyame\nW’Agyenkwa refr1 wo nd1\nFa wo nkwa b4 af4r ma Nyame\nSeesei na tsie w’Ewuradze\nN’aba no nyinaara aber\nApaafo nyina apetse;\nFa wo nkwa b4 af4r ma Nyame\nW’Agyenkwa refr1 wo nd1\nP AN F 324"
  },
  {
    "id": "twi-248",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 248,
    "title": "S! $NNTSE d1m a, nky1 mennk1ka (2)",
    "lyrics": "S! $NNTSE d1m a, nky1\nmennk1ka  (2)\nM’Egya fie w4 tsenabea pii;\nS1 4nntse d1m a, nky1\nmennk1ka\nP AN F 330"
  },
  {
    "id": "twi-249",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 249,
    "title": "W$MB$ dawur nkodu asaase ano",
    "lyrics": "W$MB$  dawur nkodu asaase\nano\nW4nsan nk4hw1 Bible\nW4mma frankaa n’do na\nnokwar n’ reyew\nW4nsan nk4hw1 Bible\nWongina ndam m’mma\nnokwar n’\nS1 $ko n’ y1 dzen mpo a,\nMma w4mmpem adze mmfi\nnokwar no ho\nAs1m nwanwa, enyimnyam\nas1m;\nW4nsan nk4hw1 Bible\nP AN F 345"
  },
  {
    "id": "twi-250",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 250,
    "title": "Y! m’ krado, $hen y1 m’ krado",
    "lyrics": "Y! m’ krado, $hen y1 m’\nkrado\nY1 m’ krado na soma m’ (2)\nW4 nkor4fo ruwu, h4n adan\nr’bubu\nHom afasu redwuriw, 4tamfo\nafa h4n\nY1 m’ krado no soma m’\nP AN F 368"
  },
  {
    "id": "twi-251",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 251,
    "title": "KA me nko a nky1 meehu Wo yie",
    "lyrics": "KA me nko a nky1 meehu Wo\nyie\nKa me nko a nky1 meehu Wo\nyie\nNa maad4 wo, na maasom wo\nMedze moho nyina ama wo\nP AN F 370"
  },
  {
    "id": "twi-252",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 252,
    "title": "Y!Y! mbeamudua n’ ho akofo Y1reper d1 y1b1gye akra",
    "lyrics": "Y!Y! mbeamudua n’ ho akofo\nY1reper d1 y1b1gye akra\nH4n a b4n dze h4n ato\nmpokyer1 mu nyinaa\nChrist b4gya n’ nye h1n akodze\nNyame N’as1m nye hen\nakoky1m,\nYedzi nyim w4 b4n, 4b4nsam\nnye wiadze do\nO konyimdzi, O Alleluia!\nY1b4twe akra ama h1n sor Hen\nBera Eguamba nye h1n\nkwankyer1fo\nO! konyimdze w4 h4 ma h1n daa\nPANF 377"
  },
  {
    "id": "twi-253",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 253,
    "title": "M’BEYI Jesus akyer1 Medze Jesus b1kasa",
    "lyrics": "M’BEYI Jesus akyer1\nMedze Jesus b1kasa\nMedze Jesus b1hy1 m’akoma\nm’\nNa $akyer1kyer1 me daa\nAlleluia! Y1b1ma No do!\nAlleluia! Y1beyi N’ay1w!\nAlleluia! Alleluia! Alleluia!\nAlleluia!\nAlleluia! Y1b1ma No do!\nPANF 380"
  },
  {
    "id": "twi-254",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 254,
    "title": "OEBUBU mo mpokyer1 m’ $ama mafa mo ho edzi",
    "lyrics": "OEBUBU mo mpokyer1 m’\n$ama mafa mo ho edzi\nFahodzi nye enyigye,\n$ama menya n’ w4 Wo mu\nFahodzi fi nkowaasom m’\nFi adzesoa durdur mu\nMenny1 abonsam akowaa bio\nMey1 Nyame ne ba\nMey1 Wodze, me Wura Jesus\nDaa daa nyina ‘ra mey1 Wodze\nM’akoma rotow ndwom d1,\nEnyimnyamnka Eguambaa n’\nPAN F 389"
  },
  {
    "id": "twi-255",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 255,
    "title": "AHEN mu Hen na $reba n’ampa",
    "lyrics": "AHEN mu Hen na $reba\nn’ampa\nNo tum k1se n’ b4wosow\nwiadze nyina\nEwufo b4so1r nye atseasefo\nnyina\nB4b4 m’ ekehyia No w4 wimu\nh4\nM’b1ka ho, Alleluia! M’b1ka ho\nbi\nNo b4gyaa ntsi mo nso m’b1ka ho\nNdzeb4ny1fo runntum nnhw1\nN’enyim hy1nky1n n’\nAhotsewfo nye No b1tsena\nafeb44\nPAN F 423"
  },
  {
    "id": "twi-256",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 256,
    "title": "EWURADZE bue m’enyiwa ma munhu W’ (2)",
    "lyrics": "EWURADZE bue m’enyiwa ma\nmunhu W’ (2)\nWo mu na nkwa w4, Wo mu\nna tum w4\nEwuradze, bue m’enyiwa ma\nmunhu W’\nPAN F 423"
  },
  {
    "id": "twi-257",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 257,
    "title": "NYEW, $see me d1 montwe4n NYEW, $see me d1 montwe4n",
    "lyrics": "NYEW, $see me d1 montwe4n\nNYEW, $see me d1 montwe4n\nH4n a w4twe4n Ewuradze nya\naho4dzen fofor\nWotu d1 ak4r, w4nantsew\naw4mmbr1 da\nNyew, Osee me d1 montwe4n\nN’enyim\nPAN F 452 Eunice Addison"
  },
  {
    "id": "twi-258",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 258,
    "title": "AS$R Wura, Nyame Y1ser1 W’b4hw1 Wo mba",
    "lyrics": "AS$R Wura, Nyame\nY1ser1 W’b4hw1 Wo mba\nTsie h1n ebisadze yi\nNa ma W’as4r ngyina.\nPAN F 454"
  },
  {
    "id": "twi-259",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 259,
    "title": "Monto dwom pa mma agyenkwa, 4ne Yehowa!",
    "lyrics": "1. Monto dwom pa mma\nagyenkwa, 4ne Yehowa!\nmonna n’ase, munyi n’ ay1\nw4 mmaa nyinaa!\n!s1 Kristo gyidifo s1 w4ma\nne din no so\nMonna n’ ase, munyi n’ay1,\nmunhyira no daa!\n2. Kristo manfo ne ne\nmpamfo ho ka w4n ho p1;\nna w4n yiye ne asomdwee\ny1 w4n wura f1\n$d4 ne mmofra papa,\nna wohu amne a\n$boa w4n ma w4tra komm\nhy1 no anunyam\n3. S1 atamfo atrosomfo d44so\npii nso a,\nIesu mmofra bo rentu da,\nw4de f1w k4 sa;\nWokura anyames1m na\nw4b4 mpae dennen;\nSaa nkrant1 ne akode na\nw4de yi d4m\n4. Israelfo, Nyame nkr4fo!\nmomma mo ani nnye\nS1 mo y1fo ne mo gyefo\nhw1 mo so yiye\nMo a moy1 Sion mma,\nmomma mo ani nka\nS1 mo hene anya tumi\n4soro ne fam!\nTwi Nnwom 15"
  },
  {
    "id": "twi-260",
    "language": "twi",
    "languageLabel": "Twi",
    "number": 260,
    "title": "Onyame kae me 1! Kae me ma 1ny1 yiye!",
    "lyrics": "1. Onyame kae me 1!\nKae me ma 1ny1 yiye!\nDom br1 w’ani ase\nFa w’ahumm4b4 hw1 me!\nMinnim 4gyefo bi\nS1 wo nkutoo kor1\nMisu mefr1 wo s1:\nMe Nyame ka1 me 1!\n2. Onyame, kae me 1!\nNanso, nkae me b4ne\n!no ho de, wode wo ba\nkoro ama me\nS1 4mfa ne mogya\nmm1pata mma nnipa\nNe nti na mesr1 wo s1\nMe Nyame, kae me 1!\n3. Onyame, kae me 1!\nYi me m’awer1how mu!\nHw1 me ne me fi so\nFa wo nhyira gu me so!\nMa wo honhom kronkron\nNni me so yie\nNa ma 4nhy1 me den;\nMe Nyame, kae me 1!\n4. Onyame, kae me 1!\nKae me m’ amahenunum!\nS1 nnipa gyaw me mu\nNa merey1 mawu a;\nMesr1 s1: hw1 me kra,\nKyekye me wer1 p1,\nNa gye me bra wo nky1n!\nMe Nyame, kae me 1!\n5. Onyame, kae me p1!\n$kae me y1 me yiye,\nKyekye me wer1,\nEnti nso m1da n’ase,\nNa merensuro hwee,\nMe ho nhia me,\nOnyame hw1 daa\n$kae me yiye p1,\nTwi Nnwom 195\n261\n1. Yesu, wo nky1n na m1tra\nDaa na m1som wo nkutoo!\nAde biara rempam me:\nM1fa wo kwan pa no so\nWone me nkwa mu nkwa no\nMe kra mu anuoyam,\nS1nea bobe ma ne baa nkwa\nS1 woy1 ma me nso nen.\n2. Hene na 4y1 me yiye\nSen wo a wodom me daa?\nDom nnepa bebree w4 wo mu\nMa me a midi hia\nHena na 4ma me wer1\nKyekye sen wo, me wura a\nW4de soro ne asase tumi\nahy1 wo nsa?\n3. !he na mehu saa wura a\nWay1 nea Yesu y1e?\n$de ne mogya at4 me\nW4 owu ne b4ne mu\nMenny1 nea 4de ne nkwa\nAma ‘wu no de ana?\nSo minnsua mennkyer1 no\nS1 medi n’akyi ara?\n4. Anigye mu ne amanem\nM1tra wo nky1n ara:\nMede me honhom, me honam\nNe me kra mehy1 wo nsa\nNea wop1 no na m1y1\nWofr1 me fi ha, a m1k4;\nS1 mebata wo ho daa a,\nWu po reny1 me wu-na\n5. Ka me ho ewi yi ase!\nNa s1 me da y1 adu\nNa s1 ade y1 asa me\nNa owu sum adur’ a:\n!nna tee wo nsa gu me so\nHyira me na se me s1:\n“Me ba, wo famtra ahi ni\nNa bra b1tra nkwa pam’!”\n6. S1 owu reyi me hu a,\nOwura Yesu, ka me ho\nY1 me hann owu bon sum mu,\nNa ma daa ade nkye me\nM’ani so rey1 kusuu a,\nB1hyer1n ma me honhom;\nNa mafi ha mako honom\nS1 4h4ho k4 ne krom.\nTwi Nnwom 176\n262\n1. Y1n nnipa mma nky1 koraa;\nY1sen rek4 s1 sunsuma,\nY1n sunsuma reware a;,\nYehu mu s1 ade resa\n2. Ampa, y1aba amm1ky1wa\n!d1n nti na ay1 saa?\nEfi onipa asehwem;\nNyame ne nnipa atetem.\n3. B4ne ama y1atew y1n ho\nAfi y1n agya Nyame ho;\nEnti yenni ne nkwa bio\nOwu nko na 1da y1n h4\n4. Na gyidifo de, wonnsuro,\nNa w4anya nkwa foforo\nS1 Yesu hann tew y1n mu a,\nyehu no s1 y1n daa nkwa.\n5. Na s1 obi mp1 no a,\nOnii no b1tra sum mu daa\nna da a awufo nyinaa\nBenyan no, 4rennya nkwa.\n6. Me gyefo pa, mesr1 wo s1;\nMa wo dom fr1 nnyan me n1!\nWo hann b1tew me mu ampa,\nNa mab1y1 wo hann no ba!\n7. B1hran me konona kusuum\nNa pam owu ne b4ne sum\nS1 wiase p1 sum no a\nMe de, m1nante hann mu\ndaa\n8. !nna, miwu a, m1y1 konim,\nYesu b1ka m’ani agum,\nNa matetew m’ani bio\nMahw1 n’anim ne hann mu h4\nTwi Nnwom 44\n263\n1. Wo a me koma afe wo,\nM’agyenkwa no, wow4 he?\nIesu, woafa me 4y4nko,\nNa afei woafa he?\n2. Me kra ay1 haahaahaa s1\nRep1 wo, me d4fo pa\nB4ne ama maber1 s1\nEnti bra begye me nkwa!\n3. Mede mm4br4 nne m1fr1 wo\nYesu, he po na wok4?\nHwee remma minnya ahot4\nAkosi s1 mehu wo.\n4. S1 minya ‘nomaa ntaban 1,\nAnka nn1 m1tu mak4\nMak4hwehw1 wim ne soro\nMahu nea Iesu w4.\n5. Yesu na 4ma me bo t4,\nOyi me m’awer1howm;\nNe nko mu na minya ahot4,\n$pam hu ne b4ne sum\n6. Merenni nk4mm4 bribi ho\nDe b1k4 akosi s1\nYesu de ne ho b1ky1 me\nAma manya ahomeye\n7. Damfo Yesu, ma minhu wo!\nMe kra reham hwehw1 wo,\nS1, nnyaw me nto bonen,\nDan b1hw1 me mm4bor4!\n8. Ma minnya wo asomdwoe no,\nMekot4 wo, Iesu, bra!\nBra b1dom me, b1tena me mu\nNa behyira me dabaa!\nTwi Nnwom 264\n264\nBedidi, bedidi\nBedidi w4 Yesu pon so daa\nnyinaa\nNea 4y1n nnipa mpempem\n$dan nsu no weyin;\nNea $k4m de no, 4fr1 n’ s1\nommedidi\nPANT 900\n265\n1. Nkwa abodoo, Yesu ne\nnkwa abodoo no\nNkwa abodoo no\nNkwa abodoo, Yesu ne\nnkwa abodoo no\nNkwa abodoo no\nObiara a 4bedi no 4k4m\nrenne no\nObiara a 4b1nom no\n‘suk4m renne no\n2. Nkwa asuten, yesu y1\nnkwa asuten no\nNkwa asuten no, (2)\nNea osuk4m de no no.\n$mmra mm1non bi\nNea osuk4m de no no,\n$mmra mm1non bi.\nPANT 901\n266\n1. Me wer1 remfi\nMe wer1 remfi ara da\nAdehyedi k1se yi,\nYesu mogya at4 aky1 me;\nMe wer1 remfi ara da.\n2. Me wer1 remfi\nMe wer1 remfi ara da\nS1 nkan n’mefom Agya n’ a,\nYesu mogya ab1pata;\nMe wer1 remfi ara da\n3. Me wer1 remfi\nMe wer1 remfi ara da\nS1 nkan n’mey11 akoa mpo a,\nYesu mogya ay1 m’4dehye;\nMe wer1 remfi ara da.\n4. Me wer1 remfi\nMe wer1 remfi ara da\nS1 nkan n’ midii f4 mpo a,\nYesu mogya abu me bem;\nMe wer1 remfi ara da\nPANT 902\n267\nDibi na nom bi; Mene abodoo no,\nDibi na nom bi; Mene abodoo no\nDibi na nom bi; Mene abodoo no\nMunni bi na mobenya nkwa.\nPANT 904\n268\n1. $Y! nkwafo, ade biara nso\nno y1\n$y1 nokwafo, ade biara nso\nno y1\n$y1 nokwafo, ade biara nso\nno y1\n$betumi ay1 ama me o\n$betumi ay1, $betumi ay1\n$betumi ay1 ama me o\n$betumi ay1\n2. Nso Nyame y1\n3. Way1 ama me awie\nPANT 384\n269\n$NO n’ ewiase w4 Ne nsam,\n$no n’ ewiase w4 Ne nsam,\n$no n’ ewiase w4 Ne nsam,\n$no n’ ewiase w4 Ne nsam,\nPANT 404\n270\nNnwom bi a y1b1to w4 soro h4 a!\nNnwom bi a y1b1to w4 soro h4!\nBer1 a y1behu Jesus anim ne\nanim\nNa y1ad4m sor’ adwontofo n’\nw4 sor h4 a!\nNnwom bi a y1b1to w4 soro h4 a!\nAnuonyam a ahotewfo n’ benya\nAo, anuonyam, anuonyam\nanuonyam\nNnwom bi a y1b1to w4 soro h4 a!\n271\nKans1 wiase yi nyinaara y1 me\nde\nNa menni Awurade a, menns1\nhwee (2)\nS1 apuei ne at4e1 nyinaara y1\nme de\nNa me din nni nkwa nwoma\nno mu a\nKans1 wiase nyinaara y1 me de\nNa menni Awurade a menns1\nhwee\n272\nMenim s1 Awurade bebue\nkwan bi ama m’\nS1 meb4 bra pa a 1ho te a,\nYi b4ne akwa, na mey1 papa a,\nMenin s1 Awurade bebue kwan\nbi ama m’\n273\nO! tie Jesus ne nne a, !de\nns1mpa rebr1 wo\nO! tie Jesus ne nne a, !nam\nab4fo so\n6.\nMa akoma a ahaw asomdwoe\nMa awer1ho kra anigye\nO! tie nne a efiri sor’\nJesus b1san wo ho.\n274\nKasa, $hene kasa\nMa nsu no ny1 komm w4\nm’anim\nKasa, $hene kasa\nMa nsu no ny1 komm w4\nm’anim\nAwer1ho nyinaa m’\nAhokyer1 nyinaa m’\nKasa ma nsu no ny1 komm (2)\n275\nDZI kan ma yendzi W’ekyir\ndaa\nDzi kan ma yendzi W’ekyir;\nS1 4kwan no mu y1 sum d1n\nara a\nWo na’y1 kandzea a ‘rehyer1n.\nP AN F 459, Eunice Addison\n276\nMENYA nhyira, nhyira a 4bor\ndo;\nMow4 Nyame a 4tse akoma m’\n$y1 Pentekost w4 me kra mu\n$y1 ogya a 4tamfo no suro.\nP AN F 569\n277\nME KRA, hyira Ewuradze\nNa dza 4w4 wo mu nyinara\nNhyira Ne dzin kr4nkr4n no.\nMe kra, hyira Ewuradze\nChorus\nMe kra, hyira Ewuradze (2)\nMe kra, hyira Ewuradze (2)\nP AN F 73\n278\nMEGYE Nyame edzi\nMegyaa b4ne y1\nMay1 Nyame ne ba\nMow4 nkwa a onnyi ewiei\nN’as1m, N’as1m\nN’as1m tse mo mu\nN’as1m tse mo mu\nNtsi mo d4 mo nua\nP AN F 459, Eunice Addison\n279\nJESUS, wokum N’ maa me\nW4 Calvary\nWodze nso1ky1w soaa No\nW4 Calvary\nH4 nna Owuu ahomtsew wu;\nH4 nna wobuee Ne mfem;\nMa b4gya nsu fii pemee\nW4 Calvary\nRH 177, P ANF 480\n280\n1. SUNSUM Kr4nkr4n bra (2)\nSunsum  Kr4nkr4n bra\nAo, fa d1w bra, Alleluia!\nSunsum  Kr4nkr4n bra.\n2. S1 Ammba a, y1aba no gyan\nS1 Ammba a, y1aba no gyan\nS1 Ammba a, y1aba no gyan\nAo, fa d1w bra, Alleluia!\nSunsum  Kr4nkr4n bra.\n3. Y1rotwe4n W’y1ay1 as4r\nY1rotwe4n W’y1ay1 as4r\nAo, fa d1w bra, Alleluia!\nSunsum Kr4nkr4n bra.\n4. Y1rotwe4n Wo tum no\nY1rotwe4n Wo tum no\nAo, fa d1w bra, Alleluia!\nSunsum Kr4nkr4n bra.\n5. Y1rotwe4n W’enyimnyam\nY1rotwe4n W’enyimnyam\nAo, fa d1w bra, Alleluia!\nSunsum  Kr4nkr4n bra.\nP ANF 486\n281\nMO HO d4 ntsi na Jesus baa\nwiadze\nD1 m’Agyenkwa;\nMo ho d4 ntsi na Jesus bowui\nw4 dua no do;\nMo ho d4 ntsi na $dze m’ rok4\nN’enyimnyam mu\nDabi m’bohu No d4 bun nyina\nD1 mbr1 4tse\n282\n$S! ayeyi, Agya Nayme s1\nayeyi,\nAgya Nyame ade a Way1\n$s1 ayeyi oo,\nAyeyi s1 No, momfa mma N’,\n$s1 ayeyi oo,\nAgya Nyame ade a Way1\n$s1 ayeyi oo, momfa mma N’,\nNnaase s1 No, momfa mma N’\nNhyira s1 No, momfa mma N’\nNtrontron s1 No, momfa mma N’\nP ANT 348\n283\n$DZEB$NY!NYI nnyi\nenyimnyam\nW4 ahengua n’ enyim\nEguamba n’ dze b4gya dehye\nb4t4 aky1 m’\nAma me so maasoa nkwa\nahenky1w\nP ANF 519\n284\nASAASE mba m’nyinaa\nho4f1wfo Ey1 dansewa ma\nW’ayefor;\nWo mu na emudzi kr4nkr4n w4\nCalvary $barimba nwanwanyi\nCalvary $barimba no\nOedzi m’akoma do nyim\nOwui maa m’ fahodzi\nCalvary Osiarfo no\nRH 699, P ANF 527\n285\n1. HW! Nyimpa b1n nye Oyi\na ogyina\nNyame na nyimpa ntam?\nN’enyiwa tse d1 Ogyaframa\nNe papaa dze Ne nsamu\nJohn hun N’ w4 sor esuon\nno mu\nD1 ewia ne hyer1n dzendzen\nHw1 Nyimpa b1n nye Oyi?\nOnyimpa b1n nye $no?\n$no nye Enyimnyam Hen no\nMara nye Mara no\n$y1 Alpha nye Omega\nAhy1ase nye ewiei\nNe dzin nye $domankoma\nEgya\nMbersantsen nyinara\n2. Hw1, Nyimpab1n na\n$rekasa kyer1\nBasia n’ nsubura n’ do h4 n’\n“Mb1ma wo nkwa a onnyi\newiei, 4sombo\nKy1n dza nyimpa b1ma\nNa obiara a 4bnom nsu yi\nbi no\n$b1tsena h4 daa nyina.\nHw1 Nyimpa b1n nye Oyi?\nOnyimpa b1n nye $no?\n3. Hw1, nyimp b1n nyi Oyi a\n$kasa ayarfo ho?\n$se, “W4dze w’b4n aky1 w’\nFa wo k1t1, nantsew”\nOgina h4 nd1 d1 ‘yarsafo\nNa $tse1m, d1 “Hom nhw1 Me”\nHw1 Nyimpa b1n nye Oyi?\nOnyimpa b1n nye $no?\nP ANF 527\n286\n1. BER a Apost4lek hy11 ase\nW4 tsetse nda no mu no,\nSaul fi Tarsus suaa\ndzendzenndzen\nD1 4b1s11 as4r yi\nNa Damascus na w4somaa N’\nD1 4nk4s11 edwuma no\n$rok4 n’ Agenkwa n’ hyiaa no\nY11 no Apost4leknyi\nNtsi y1b1fa Christ Ne\nnkyer1kyer1\nApost4lek nokwarfo\nS1 wo so gye Christ\nns1mpa n’ dzi a\nEbey1 Apost4leknyi\n2. $nye Silas k4r efiadze,\nSiand1 w4som Christ, h4n\nHen\nNaaso Enyimnyam ka h4n ho\n‘Nafa n’ h4n beenu toow\nndwom\nFiadehw1fo tsee h4n\nndwom no\nOhun d1 dan n’ rowosow\nOhun d1 w4y1 Apost4lekfo\nNo so y11 Apost4leknyi\n3. $rok4 Rome ekedzi dase\nAma n’ Ewuradze no,\nEhum tuu k1se w4 po do\nPaul nko na 4dwedwee h4n;\nH1n mu panyin huu ne\nndam no\nBera hon akom etutu n’\n4p11 d1 nky1 no so b1y1\nJewnyi Apost4leknyi\n4. Mfe pii ab1sen naaso\nYehu h4n, kuw nkakraba n’\nS1 nkor4fo b4 h4n adapaa\nmpo a\nH4n nyina y1 kor gyina h4\nS1 wo so betsie h4n\namandze1\nDadaa, naaso fofor no a\nWo so b1tse Christ mu\nns1m n’\nNa ay1 Apost4leknyi\nP ANF 538\n287\nAHY! Ma, m’akoma ahy1 ma\nM’akoma ahy1 ma\nNgo, Nyame Ne ngo\n$dze ngo forfor asra m’ (2)\nEunice Addison\nP ANF 559\n288\n1. Ab4ne’ mommra $tease no h4\n$no ara ne Jesus\nNea 4nyan okunafo ba no\n$no ara ne Jesus\nChorus\n$no ara ne Jesus\nNwanwa 4dwumay1fo Jesus\nMonhyira ne din\n$te ass daa\n$no ara ne Jesus\n2. S1 wo bra y1 gyigya gyigya\n$no ara ne Jesus\nNea 4ma apo asor4kye gyae\n$no ara ne Jesus\n3. Mommra ne nky1n\n$no ne hann\n$no ara ne Jesus\nNea 4ma amifuraefo hu ade\n$no ara ne Jesus\nIndex\nAAAAA\nAb4e m ommra $tease no h4 135 135\nAbraham, Sarah, w4dze ba b44 h4n anohaba 123\nAdekyee f11f1, f11f1 119\nAdom na w4de nam gyidi so  102\nAd4f9, afei na y1y1 102\nAgya pa bi refr1 wo s1 bra 102\nAgye me tontom wo  81\nAgyenkwa a 4d44  98\nAgyenkwa Yesu wu maa me  103\nAhotewfo munhyira Awurade  80\nAkwantu bi w4 ho a yebetu  114\nAmanaman 4baatan pa  94\nAmen, Amen, Blessing and Glory  53\nAna W’akoma p1 nhyira?  105\nAnd can it be, that I should  gain  32\nAnka manya s1 mas1 Wo,  103\nAnka nea mete no ware paa  112\nAo bra ma yendzi d1w  110\nAs4re yi ne fapem ne Jesus  85\nAsodzi da mo do  111\nAsofo Yehowa  83\nAway far over Jordan  54\nAwurade aman nyinaa  100\nAwurade d4m so Safohene  80\nAwurade ne me hw1fo,  87\nAyeyi na mede ma Nyame  103\nBBBBB\nBedidi, bedidi 130\nBer a wi da do yi mframa rob4 yi 121\nBer a Apost4lek hy11 ase 134\nB4 bra me kra do  81\nB4gy a aofi Ne mfe m’ 124\nB4gy, Jesus b4gya 126\nBra b1hw1 Jesus N’;aho4f1 119\nBue maso ma mente  Was1m 82\nBura bi w4 h4 b4gya ma  113\nCCCCC\nCalvary na m’Agyenkwa wui 121\nDDDDD\nDaakye, daakye, daakye 120\nD1n na memfa minyi  w’ ay1  96\nD1w, d1w ahy1 m’akoma ma 122\nDa no b1y1 nkonim nkonimdida,  103\nDaa Daa daa,  100\nDaa nyinaa, Awurade  103\nDavid sanku a  103\nDin bi w4h4 a 1y1 de  98\nD1n na memfa miniyi W’ay1 96\nDwen papa a $y1 ma wo n’ ho 106\nDzi d1w, 4kofo, dzi d1w 122\nDzi kan ma y1ndzi W’ekyir daa 135\nEEEEE\nEguamba N’ wokum no n’ 122\nEmmanuel Nyame ne y1n w4 h4  88\nEwuradze, W’as1m tsim,  109\n!bere a merekyinkyin 4bra sare so  83\n!y1 Yesu n’adom are kwa 90\nFFFFF\nFa w’akwan hy1  87\nFa Wo nkwa ba af4r ma Nyame 125\nGGGGG\nGetsemane turo mu h4  115\nGu me kanea mu ngo mamenhyer1n daa:  84\nGya me k4 bep4 no atifi  80\nGyidi k1se ho b4hy1 no 93\nGyina me nky1n, me kra d4fo pa  93\nHHHHH\nHena ne me Yehowa 92\nHonhom kronkron me kra d4fo  80\nHwim me k4 soro 119\nHwie ma 1ny1 ma 92\nHw1 Nyimpa b1n nye Oyi 133\nHy1 dzen na mma nnsuro123 123\nJJJJJ\nJesus, Jesus 120\nJesus, Jesus, Jesus  106\nJesus b4gya nko na etumi 160\nJesus mogya nko na  106\nJesus mogya repram  105\nJesus resiesie tenabea w4 Sor’ 105\nJesus, wokum N’maa me\nKKKKK\nKa me nko nky1 meehu Wo oyie1 129\nKanea a y1de hw1 h1n kwan 130\nKans1 wiase yi nyinaara y1 me de 134\nKasa ma y1nte wo nne  80\nKasa $hene, kasa 134\nKen a  a y1dze hw1 h1n kwan mu  109\nKenyan W’eduma yi,  111\nKo gyidi ko pa;  86\nKyere1 y1n W’anuonyam,  94\nKr4nkr4n, kr4nkr4n, kr4nkr4n\nKwasida, mew4 anigye\nM\nM!TO Awurade ho dwom  111\nM!TO DWOM mama  97\nM!Y! nea m1tumi  90\nM1d4 wo O Kristo  81\nM1k4 bep4w no so  85\nM1y1 d1n na makamfo Wo m’Agya e? 84\nMa Elijah atade no ngu me so;  92\nMa Honhom kronkron mu ogya no mmra  113\nMa meny1 s1nea tetefo no y11e 94\nMa y1n nsu no bi 85\nM’agyen Yesu ame  91\nMaho4den ne no, 95\nMahu Yesu, Yosef ba no,  103 b4 s1 medi  90\nMakoma ahy1 ma, ahy1  89\nManya y4nko Jesus mu;  86\nMasomdwoe apam w4 h4 ma w4n a  104\nMbr1 Jesus Ne dzin dua  108\nMbr1 metse yi ara minnyi hwee ka 08\nMe br1 reny1 kwa,  88\nMe honhom, kra ne me honam  82\nMe hye hamaafa nea eye am me 89\nMe ne No bedi dew daa  88\nMe ne Nyame b1k4 awie1  91\nMe Wura, m’ Agyenkwa  96\nMede 4hyewb4 gya ne 85\nMedi Wo din ho adanseakyer1 aman 91\nMenya ngyirama apem  107\nMerehwehw1 wo 81\nMerensesa me Nyame da:  85\nMerepem so k4;  84\nMeresiesie nnipa bi ama w4n tumi 94\nMew4 Nyame Otumfo w4 m’anim 86\nMey1 honam ne mogaya na 90\nMey1 Oyame mey1 Onyame, 88\nMeyi Jesus m’akyer1 84\nMigyina Calvary bep4 so  80\nMenim s1 mogya no,  88\nMogya n’ atueemuk4 kwan ama y1n nso  112\nMomma y1nkamfo Yehowa 83\nMomma yenni y1n Nyankop4n akyi; 85\nMonhw1 nnomaa a wakyin w4 wim  87\nMonkeka s1 Yesu ye 84\nMonna Nyame ase daa 24\nMonto dwom d1d1 nyi  101\nMrotw14n ne mbae no  104"
  }
]
