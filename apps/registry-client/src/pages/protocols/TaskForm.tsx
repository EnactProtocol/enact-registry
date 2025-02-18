import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { Icon } from "@iconify/react";
import { useTaskStore } from "@/store/taskStore";
import { toast } from "sonner";
import { CapabilityWrapper, InputConfig } from "@/types/protocol";
import { BasicInformationSection } from "@/components/BasicInformation";
import { InputConfigurationSection } from "@/components/InputConfiguration";
import { OutputConfigurationSection } from "@/components/OutputConfiguration";
import TaskConfigurationSection from "@/components/TaskConfigurations"
import { formSchema, FormValues } from "@/components/types"
import { load as yamlLoad } from 'js-yaml';

const TaskForm = () => {
  const navigate = useNavigate();
  const addTask = useTaskStore((state) => state.addTask);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskId: "",
      description: "",
      authorName: "",
      protocolType: "atomic",
      version: "1.0.0",
      inputs: [{ 
        name: "", // required
        type: "string", // required
        description: "", // required
        default: "" // optional
      }],
      taskType: "script",
      taskLanguage: "python",
      taskCode: "",
      outputs: [{ 
        name: "", // required
        type: "string", // required
        description: "", // required
        default: "" // optional
      }],
    } satisfies FormValues // This ensures the defaultValues match our type exactly
  });

  const { fields: inputFields, append: appendInput, remove: removeInput } = useFieldArray<FormValues>({
    control: form.control,
    name: "inputs"
  });
  
  const { fields: outputFields, append: appendOutput, remove: removeOutput } = useFieldArray<FormValues>({
    control: form.control,
    name: "outputs"
  });

  const SERVER = "http://localhost:8080";

  const handleYamlUpload = async (content: string) => {
    try {
      // const response = await fetch(`${SERVER}/api/yaml/process`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ file: content }),
      //   credentials: 'include',
      // });

      // if (!response.ok) {
      //   throw new Error(`Server error: ${response.statusText}`);
      // }
      const yamlText = await content; // Get the raw text instead of calling .json()
      const yamlContent = yamlLoad(yamlText);
      console.log("yamlContent",yamlContent);
      if (!yamlContent.enact || !yamlContent.id) {
        throw new Error('Invalid YAML: Missing required fields (enact, id)');
      }

      const taskData: CapabilityWrapper = {
        id: yamlContent.id,
        name: yamlContent.id,
        description: yamlContent.description || "",
        teams: [],
        isAtomic: yamlContent.type === "atomic",
        protocolDetails: {
          enact: yamlContent.enact,
          id: yamlContent.id,
          name: yamlContent.id,
          description: yamlContent.description || "",
          version: yamlContent.version || "1.0.0",
          authors: yamlContent.authors || [],
          inputs: yamlContent.inputs || {},
          dependencies: yamlContent.dependencies || {},
          tasks: (yamlContent.tasks || []).map((task: any) => ({
            id: task.id,
            type: task.type,
            language: task.language,
            code: task.code,
            description: task.description
          })),
          flow: {
            steps: (yamlContent.flow?.steps || []).map((step: any) => ({
              task: step.task,
              dependencies: step.dependencies
            }))
          },
          outputs: yamlContent.outputs || {},
          type: "atomic"
        },
        version: ""
      };

      // Update form values
      form.setValue('taskId', taskData.name);
      form.setValue('description', taskData.description);
      form.setValue('version', taskData.protocolDetails.version);

      if (taskData.protocolDetails.authors?.[0]) {
        form.setValue('authorName', taskData.protocolDetails.authors[0].name);
      }

      // Set inputs
      const inputsArray = Object.entries(taskData.protocolDetails.inputs).map(([name, config]) => ({
        name,
        type: config.type,
        description: config.description,
      }));
      form.setValue('inputs', inputsArray);

      // Set task details
      if (taskData.protocolDetails.tasks?.[0]) {
        const firstTask = taskData.protocolDetails.tasks[0];
        form.setValue('taskId', firstTask.id);
        form.setValue('taskType', firstTask.type);
        form.setValue('taskLanguage', firstTask.language || '');
        form.setValue('taskCode', firstTask.code || '');
      }

      // Set outputs
      const outputsArray = Object.entries(taskData.protocolDetails.outputs).map(([name, config]) => ({
        name,
        type: config.type,
        description: config.description,
      }));
      form.setValue('outputs', outputsArray);
      addTask(taskData);
      toast.success('YAML loaded and processed successfully');
    } catch (error: any) {
      console.error('Error processing YAML:', error);
      toast.error('Failed to process YAML file. Please check the format.');
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // Convert inputs array to object format
      const inputsObject: Record<string, InputConfig> = {};
      values.inputs.forEach((input) => {
        inputsObject[input.name] = {
          type: input.type,
          description: input.description,
          ...(input.default ? { default: input.default } : {})
        };
      });

      // Convert outputs array to object format
      const outputsObject: Record<string, InputConfig> = {};
      values.outputs.forEach((output) => {
        outputsObject[output.name] = {
          type: output.type,
          description: output.description,
          ...(output.default ? { default: output.default } : {})
        };
      });

      const newTask: CapabilityWrapper = {
        id: 0,
        name: values.taskId,
        description: values.description,
        teams: [],
        isAtomic: values.protocolType === 'atomic',
        version: values.version,
        protocolDetails: {
          enact: "1.0.0",
          id: values.taskId,
          name: values.taskId,
          description: values.description,
          dependencies: {},
          version: values.version,
          authors: [{ name: values.authorName }],
          inputs: inputsObject,
          tasks: [{
            id: values.taskId,
            type: values.taskType,
            language: values.taskLanguage,
            code: values.taskCode
          }],
          flow: {
            steps: [{ task: values.taskId }]
          },
          outputs: outputsObject,
          type: "atomic"
        }
      };
  
      await addTask(newTask);
      toast.success("Task created successfully!");
      navigate("/");
    } catch (error) {
      toast.error("Failed to create task: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-[#111828] text-white">
      <div className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <img src="/globe-bit.png" alt="Enact Globe" className="h-10 w-auto rotate-180" />
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-white">Add Task</h1>
                <button 
                  onClick={() => navigate("/task-template")}
                  className="flex items-center gap-1 text-sm text-gray-300 hover:text-white group"
                >
                  <span className="border-b border-gray-600 group-hover:border-white">Template</span>
                  <Icon icon="lucide:arrow-up-right" className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.yaml,.yml';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const content = e.target?.result as string;
                        handleYamlUpload(content);
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-1.5 rounded-md backdrop-blur-sm border border-white/20 shadow-lg transition-all"
              >
                <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                Upload YAML
              </Button>
              <Button 
                onClick={() => navigate("/")}
                className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-1.5 rounded-md backdrop-blur-sm border border-white/20 shadow-lg transition-all"
              >
                <Icon icon="lucide:arrow-left" className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-8">
            <div className="bg-[#1a1f2c] rounded-lg p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <BasicInformationSection form={form} />
                  
                  <InputConfigurationSection 
                    form={form}
                    fields={inputFields}
                    remove={removeInput}
                    append={appendInput}
                  />

                  <TaskConfigurationSection form={form} />
                  
                  <OutputConfigurationSection
                    form={form}
                    fields={outputFields}
                    remove={removeOutput}
                    append={appendOutput}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-1.5 rounded-md backdrop-blur-sm border border-white/20 shadow-lg transition-all"
                    >
                      Create Task
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;