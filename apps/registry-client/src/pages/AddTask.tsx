import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Icon } from "@iconify/react";
import { useTaskStore } from "@/store/taskStore";
import { toast } from "sonner";
import { parse } from 'yaml';
import { Task, ProtocolDetails, InputConfig } from "@/types/protocol";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const formSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  description: z.string().min(1, "Description is required"),
  authorName: z.string().min(1, "Author name is required"),
  protocolType: z.string().min(1, "Protocol type is required"),
  version: z.string().min(1, "Version is required"),
  inputs: z.array(z.object({
    name: z.string().min(1, "Input name is required"),
    type: z.string().min(1, "Input type is required"),
    description: z.string().min(1, "Input description is required"),
    default: z.string().optional(),
  })),
  taskType: z.string().min(1, "Task type is required"),
  taskLanguage: z.string().min(1, "Task language is required"),
  taskCode: z.string().min(1, "Task code is required"),
  outputProperties: z.array(z.object({
    name: z.string().min(1, "Property name is required"),
    type: z.string().min(1, "Property type is required"),
    description: z.string().optional(),
  })),
});

const AddTask = () => {
  const navigate = useNavigate();
  const addTask = useTaskStore((state) => state.addTask);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskId: "",
      description: "",
      authorName: "",
      protocolType: "atomic",
      version: "1.0.0",
      inputs: [{ name: "", type: "string", description: "", default: "" }],
      taskType: "script",
      taskLanguage: "python",
      taskCode: "",
      outputProperties: [{ name: "", type: "string", description: "" }],
    },
  });

  const { fields: inputFields, append: appendInput, remove: removeInput } = useFieldArray({
    control: form.control,
    name: "inputs"
  });

  const { fields: outputPropertyFields, append: appendOutputProperty, remove: removeOutputProperty } = useFieldArray({
    control: form.control,
    name: "outputProperties"
  });

  const SERVER = "http://localhost:8080";

  /**
   * handleYamlUpload
   * Sends the YAML content as a file to the server endpoint for processing.
   * On success, it updates the form fields with the returned data.
   */
  const handleYamlUpload = async (content: string) => {
    try {
      // Send the YAML content directly
      const response = await fetch(`${SERVER}/api/yaml/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: content }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      // Assume the server returns a JSON with the processed YAML structure
      const yamlContent = await response.json();

      // Validate the YAML structure (you can perform more robust checks if needed)
      if (!yamlContent.enact || !yamlContent.id) {
        throw new Error('Invalid YAML: Missing required fields (enact, id)');
      }

      // Map the server response to our Task structure
      const taskData: Task = {
        id: 0, // This will be set by the store
        name: yamlContent.id,
        description: yamlContent.description || "",
        teams: [], // This can be set manually
        isAtomic: yamlContent.type === "atomic",
        protocolDetails: {
          enact: yamlContent.enact,
          id: yamlContent.id,
          name: yamlContent.id,
          description: yamlContent.description || "",
          version: yamlContent.version || "1.0.0",
          authors: yamlContent.authors || [],
          inputs: yamlContent.inputs || {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tasks: (yamlContent.tasks || []).map((task: any) => ({
            id: task.id,
            type: task.type,
            language: task.language,
            code: task.code,
            description: task.description
          })),
          flow: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            steps: (yamlContent.flow?.steps || []).map((step: any) => ({
              task: step.task,
              dependencies: step.dependencies
            }))
          },
          outputs: {
            type: yamlContent.outputs?.type || "object",
            properties: yamlContent.outputs?.properties || {}
          }
        },
        version: ""
      };

      // Update the form values based on the taskData
      form.setValue('taskId', taskData.name);
      form.setValue('description', taskData.description);
      form.setValue('version', taskData.protocolDetails.version);
      // You might want to add additional logic to update the protocolType if needed
      // form.setValue('protocolType', taskData.isAtomic ? 'atomic' : '...');

      // Set individual form fields for the form UI
      if (taskData.protocolDetails.authors?.[0]) {
        form.setValue('authorName', taskData.protocolDetails.authors[0].name);
      }

      // Set the first input if it exists
      const inputKeys = Object.keys(taskData.protocolDetails.inputs);
      if (inputKeys.length > 0) {
        const firstInputKey = inputKeys[0];
        const firstInput = taskData.protocolDetails.inputs[firstInputKey];
        form.setValue('inputs', [{
          name: firstInputKey,
          type: firstInput.type,
          description: firstInput.description,
          default: firstInput.default
        }]);
      }

      // Set the first task if it exists
      if (taskData.protocolDetails.tasks?.[0]) {
        const firstTask = taskData.protocolDetails.tasks[0];
        form.setValue('taskId', firstTask.id);
        form.setValue('taskType', firstTask.type);
        form.setValue('taskLanguage', firstTask.language || '');
        form.setValue('taskCode', firstTask.code || '');
      }

      // Set the first output if it exists
      const outputKeys = Object.keys(taskData.protocolDetails.outputs.properties);
      if (outputKeys.length > 0) {
        const firstOutputKey = outputKeys[0];
        const firstOutput = taskData.protocolDetails.outputs.properties[firstOutputKey];
        form.setValue('outputProperties', [{
          name: firstOutputKey,
          type: firstOutput.type,
          description: firstOutput.description || ''
        }]);
      }

      toast.success('YAML loaded and processed successfully');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error processing YAML:', error);
      toast.error('Failed to process YAML file. Please check the format.');
    }
  };

  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const newTask: Task = {
      id: 0,
      name: values.taskId,
      description: values.description,
      teams: [],
      isAtomic: true,
      version: values.version,
      protocolDetails: {
        enact: "1.0.0",
        id: values.taskId,
        name: values.taskId,
        description: values.description,
        version: values.version,
        authors: [
          {
            name: values.authorName
          }
        ],
        inputs: values.inputs.reduce((acc, input) => ({
          ...acc,
          [input.name]: {
            type: input.type,
            description: input.description || '',  // Make sure this is never undefined since it's required
            ...(input.default !== undefined ? { default: input.default } : {})
          }
        }), {} as Record<string, InputConfig>),
        tasks: [
          {
            id: values.taskId,
            type: values.taskType,
            language: values.taskLanguage,
            code: values.taskCode
          }
        ],
        flow: {
          steps: [{ task: values.taskId }]
        },
        outputs: {
          type: "object",
          properties: values.outputProperties.reduce((acc, prop) => ({
            ...acc,
            [prop.name]: {
              type: prop.type,
              ...(prop.description ? { description: prop.description } : {})
            }
          }), {} as Record<string, { type: string; description?: string }>)
        }
      }
    };

    const response = await fetch(`${SERVER}/api/task/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error("Error creating task: " + result.error);
      return;
    }
    addTask(newTask);
    toast.success("Task created successfully!");
    navigate("/");
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="min-h-screen bg-[#111828] text-white">
      <div className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
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
          <div className="space-y-8">
            <div className="bg-[#1a1f2c] rounded-lg p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information Card */}
                  <Card className="bg-[#1a1f2c] border-white/20">
                    <Collapsible>
                      <CardHeader className="pb-2">
                        <CollapsibleTrigger className="flex justify-between items-center w-full">
                          <CardTitle className="text-white flex items-center gap-2">
                            <img src="/bubble-bit-white.webp" alt="Bubble" className="h-5 w-5" />
                            Basic Information
                          </CardTitle>
                          <Icon icon="lucide:chevron-down" className="w-5 h-5 text-gray-400" />
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="taskId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Task ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter task ID" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
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
                                  <Textarea placeholder="Enter task description" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
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
                                  <Input placeholder="Enter author name" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
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
                                  <Input placeholder="e.g., atomic" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
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
                                  <Input placeholder="e.g., 1.0.0" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                  {/* Input Configuration Card */}
                  <Card className="bg-[#1a1f2c] border-white/20">
                    <Collapsible>
                      <CardHeader>
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                          <CardTitle className="text-white flex items-center gap-2">
                            <Icon icon="mdi:input" className="h-5 w-5" />
                            Input Configuration
                          </CardTitle>
                          <Icon icon="lucide:chevron-down" className="w-5 h-5 text-gray-400" />
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {inputFields.map((field, index) => (
                            <div key={field.id} className="space-y-4 p-4 border border-white/20 rounded-lg">
                              <div className="flex justify-between items-center">
                                <h4 className="text-white text-sm font-medium">Input {index + 1}</h4>
                                {index > 0 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeInput(index)}
                                  >
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
                                      <Input placeholder="e.g., ticker" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`inputs.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Type</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., string" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
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
                                      <Input placeholder="Enter input description" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`inputs.${index}.default`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Default Value</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Optional default value" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendInput({ name: "", type: "string", description: "", default: "" })}
                            className="mt-2"
                          >
                            Add Input
                          </Button>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                  {/* Task Configuration Card */}
                  <Card className="bg-[#1a1f2c] border-white/20">
                    <Collapsible>
                      <CardHeader>
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                          <CardTitle className="text-white flex items-center gap-2">
                            <Icon icon="mdi:cog" className="h-5 w-5" />
                            Task Configuration
                          </CardTitle>
                          <Icon icon="lucide:chevron-down" className="w-5 h-5 text-gray-400" />
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="taskType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Task Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., script" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="taskLanguage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Language</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., python" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                </FormControl>
                                <FormMessage />
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
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                  {/* Output Configuration Card */}
                  <Card className="bg-[#1a1f2c] border-white/20">
                    <Collapsible>
                      <CardHeader>
                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                          <CardTitle className="text-white flex items-center gap-2">
                            <Icon icon="mdi:output" className="h-5 w-5" />
                            Output Configuration
                          </CardTitle>
                          <Icon icon="lucide:chevron-down" className="w-5 h-5 text-gray-400" />
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          <div className="p-4 bg-[#2a2e3e] rounded-lg">
                            <p className="text-white text-sm mb-2">Output Type: object</p>
                            <p className="text-gray-400 text-xs mb-4">This task's output will be an object with the following properties:</p>
                          </div>
                          {outputPropertyFields.map((field, index) => (
                            <div key={field.id} className="space-y-4 p-4 border border-white/20 rounded-lg">
                              <div className="flex justify-between items-center">
                                <h4 className="text-white text-sm font-medium">Property {index + 1}</h4>
                                {index > 0 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeOutputProperty(index)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                              <FormField
                                control={form.control}
                                name={`outputProperties.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Property Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., price" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`outputProperties.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Property Type</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., float" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`outputProperties.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Description (Optional)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter property description" {...field} className="bg-[#2a2e3e] text-white border-white/20" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => appendOutputProperty({ name: "", type: "string", description: "" })}
                            className="mt-2"
                          >
                            Add Property
                          </Button>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

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

export default AddTask;
