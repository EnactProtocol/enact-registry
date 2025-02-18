import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from './FormSection'
import { FormValues } from './types'

interface BasicInformationSectionProps {
    form: UseFormReturn<FormValues>;
  }
  
  
  export const BasicInformationSection = ({ form }: BasicInformationSectionProps) => {
    return (
      <FormSection 
        title="Basic Information"
        icon={"/bubble-bit-white.webp"}
      >
        <FormField
          control={form.control}
          name="taskId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Task ID</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter task ID" 
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter task description" 
                  {...field} 
                  className="bg-[#2a2e3e] text-white border-white/20 min-h-[100px]" 
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
  
        <FormField
          control={form.control}
          name="authorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Author Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter author name" 
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
          name="protocolType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Protocol Type</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., atomic" 
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
          name="version"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Version</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., 1.0.0" 
                  {...field} 
                  className="bg-[#2a2e3e] text-white border-white/20" 
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
      </FormSection>
    );
  };
  
  export default BasicInformationSection;