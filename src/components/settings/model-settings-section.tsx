import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettingsDialogStore } from "@/lib/settings-dialog"
import { AiModelSection } from "./ai-model-section"
import { RelatedScriptureSettings } from "./related-scripture-settings"
import { SpeechSection } from "./speech-section"

export function ModelSettingsSection() {
  const activeSection = useSettingsDialogStore((state) => state.activeSection)
  const setActiveSection = useSettingsDialogStore(
    (state) => state.setActiveSection
  )

  return (
    <Tabs
      value={activeSection}
      onValueChange={(value) => {
        if (value === "speech" || value === "ai-model" || value === "decisions")
          setActiveSection(value)
      }}
      className="gap-4"
    >
      <TabsList
        aria-label="Model settings"
        className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto"
      >
        <TabsTrigger value="speech">Live transcript</TabsTrigger>
        <TabsTrigger value="ai-model">Sermon summary</TabsTrigger>
        <TabsTrigger value="decisions">Decisions API</TabsTrigger>
      </TabsList>
      <TabsContent
        value="speech"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <SpeechSection />
      </TabsContent>
      <TabsContent
        value="ai-model"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <AiModelSection isActive={activeSection === "ai-model"} />
      </TabsContent>
      <TabsContent
        value="decisions"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <RelatedScriptureSettings />
      </TabsContent>
    </Tabs>
  )
}
