import { ReactNode } from 'react';
import { UseFormReturn, FieldArrayWithId, UseFieldArrayRemove, UseFieldArrayAppend, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Icon } from "@iconify/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormValues } from './types'
// Input field type
interface InputField {
  name: string;
  type: string;
  description: string;
  default?: string;
}

interface FormSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

const FormSection = ({ title, icon, children }: FormSectionProps) => (
  <Card className="bg-[#1a1f2c] border-white/20">
    <Collapsible>
      <CardHeader className="pb-2">
        <CollapsibleTrigger className="flex justify-between items-center w-full">
          <CardTitle className="text-white flex items-center gap-2">
            {icon}
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

interface InputConfigurationSectionProps {
    form: UseFormReturn<FormValues>;
    fields: FieldArrayWithId<FormValues, 'inputs'>[];
    remove: UseFieldArrayRemove;
    append: UseFieldArrayAppend<FormValues, 'inputs'>;
  }
  

const InputTypeOptions = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
  { value: 'date', label: 'Date' },
];

const InputField = ({ 
  index, 
  form, 
  canRemove, 
  onRemove 
}: { 
  index: number;
  form: UseFormReturn<FormValues>;
  canRemove: boolean;
  onRemove: () => void;
}) => {
  return (
    <div className="space-y-4 p-4 border border-white/20 rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="text-white text-sm font-medium">Input {index + 1}</h4>
        {canRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="h-8 px-3 text-xs"
          >
            <Icon icon="lucide:trash-2" className="w-4 h-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      <FormField
        control={form.control}
        name={`inputs.${index}.name`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Name</FormLabel>
            <FormControl>
              <Input 
                placeholder="e.g., ticker" 
                {...field} 
                className="bg-[#2a2e3e] text-white border-white/20" 
              />
            </FormControl>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`inputs.${index}.type`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Type</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="bg-[#2a2e3e] text-white border-white/20">
                  <SelectValue placeholder="Select input type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-[#2a2e3e] text-white border-white/20">
                {InputTypeOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="hover:bg-white/10"
                  >
                    {option.label}
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
        name={`inputs.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Description</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter input description" 
                {...field} 
                className="bg-[#2a2e3e] text-white border-white/20" 
              />
            </FormControl>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`inputs.${index}.default`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white flex items-center gap-2">
              Default Value
              <span className="text-gray-400 text-xs">(Optional)</span>
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="Optional default value" 
                {...field} 
                className="bg-[#2a2e3e] text-white border-white/20" 
              />
            </FormControl>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />
    </div>
  );
};

export const InputConfigurationSection = ({ 
  form, 
  fields, 
  remove, 
  append 
}: InputConfigurationSectionProps) => {
  const handleAddInput = () => {
    append({
      name: "",
      type: "string",
      description: "",
      default: ""
    });
  };

  return (
    <FormSection 
      title="Input Configuration" 
      icon={<Icon icon="mdi:input" className="h-5 w-5" />}
    >
      {fields.map((field, index) => (
        <InputField
          key={field.id}
          index={index}
          form={form}
          canRemove={index > 0}
          onRemove={() => remove(index)}
        />
      ))}
      
      <Button
        type="button"
        variant="outline"
        onClick={handleAddInput}
        className="mt-4 w-full bg-white/5 hover:bg-white/10 text-white border-white/20"
      >
        <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
        Add Input
      </Button>
    </FormSection>
  );
};

export default InputConfigurationSection;