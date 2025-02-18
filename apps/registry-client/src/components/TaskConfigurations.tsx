import { ReactNode } from 'react';
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from './FormSection';
import { FormValues } from './types'

type TaskConfigValues = {
  taskType: string;
  taskLanguage: string;
  taskCode: string;
};

interface TaskConfigurationSectionProps {
    form: UseFormReturn<FormValues>;
  }

const taskTypes = [
  { value: 'script', label: 'Script' },
  { value: 'function', label: 'Function' },
  { value: 'query', label: 'Query' },
];

const languages = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'r', label: 'R' },
];

export const TaskConfigurationSection = ({ form }: TaskConfigurationSectionProps) => {
  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <FormSection 
      title="Task Configuration" 
      icon="mdi:cog"
    >
      <FormField
        control={form.control}
        name="taskType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Task Type</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="bg-[#2a2e3e] text-white border-white/20">
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-[#2a2e3e] text-white border-white/20">
                {taskTypes.map((type) => (
                  <SelectItem 
                    key={type.value} 
                    value={type.value}
                    className="hover:bg-white/10"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="taskLanguage"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Language</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="bg-[#2a2e3e] text-white border-white/20">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-[#2a2e3e] text-white border-white/20">
                {languages.map((lang) => (
                  <SelectItem 
                    key={lang.value} 
                    value={lang.value}
                    className="hover:bg-white/10"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="taskCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Task Code</FormLabel>
            <FormControl>
              <Textarea 
                placeholder={`def get_stock_price(ticker, api_key):
    url = f"https://api.example.com/v1/stocks/{ticker}"
    response = requests.get(url, headers={"Authorization": api_key})
    data = response.json()
    return {"price": data["price"]}`}
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  autoResize(e);
                }}
                onInput={autoResize}
                className="font-mono min-h-[200px] bg-[#2a2e3e] text-white border-white/20 resize-none overflow-hidden" 
              />
            </FormControl>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />
    </FormSection>
  );
};

export default TaskConfigurationSection;