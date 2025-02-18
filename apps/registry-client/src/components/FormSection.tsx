import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Icon } from "@iconify/react";

interface FormSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

export const FormSection = ({ title, icon, children }: FormSectionProps) => (
  <Card className="bg-[#1a1f2c] border-white/20">
    <Collapsible>
      <CardHeader>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <CardTitle className="text-white flex items-center gap-2">
            <Icon icon={icon} className="h-5 w-5" />
            {title}
          </CardTitle>
          <Icon icon="lucide:chevron-down" className="w-5 h-5 text-gray-400" />
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
);