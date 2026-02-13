"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrganizationCreateSchema } from "@/lib/validation";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { handleUpload } from "@/lib/file-uploader";

import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUploader from "@/components/shared/FileUploader";
import { FormErrors } from "@/components/FormErrors";
import { FormSuccess } from "@/components/FormSuccess";
import axios from "axios";
import Dropdown from "@/components/shared/Dropdown";

interface OrganizationFormProps {
  userId: string;
  type: "Create" | "Update";
  industries: { id: string; label: string }[];
  initialData?: any;
  organizationId?: string;
}

const OrganizationForm = ({
  userId,
  type,
  industries,
  initialData,
  organizationId,
}: OrganizationFormProps) => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof OrganizationCreateSchema>>({
    resolver: zodResolver(OrganizationCreateSchema),
    defaultValues: initialData || {
      name: "",
      industryId: "",
      description: "",
      website: "",
      location: "",
      size: undefined,
      logo: null,
    },
  });

  const onSubmit = async (values: z.infer<typeof OrganizationCreateSchema>) => {
    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        let logoUrl = initialData?.logo || "";

        // Upload logo if new file provided
        if (files.length > 0) {
          const { imageUrl } = await handleUpload(files);

          if (!imageUrl) {
            throw new Error("Failed to upload logo");
          }

          logoUrl = imageUrl;
        }

        // Prepare data for API
        const apiData = {
          name: values.name,
          industryId: values.industryId,
          description: values.description,
          website: values.website,
          location: values.location,
          size: values.size,
          logo: logoUrl,
        };

        let response;

        if (type === "Create") {
          response = await axios.post("/api/organizations", apiData);
        } else {
          response = await axios.put(`/api/organizations/${organizationId}`, apiData);
        }

        if (!response.data.success) {
          throw new Error(response.data.error || "Operation failed");
        }

        setSuccess(response.data.message);

        setTimeout(() => {
          if (type === "Create") {
            router.push("/dashboard");
          } else {
            router.push(`/organizations/${organizationId}`);
          }
          router.refresh();
        }, 1000);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter organization name"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Industry */}
        <FormField
          control={form.control}
          name="industryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry *</FormLabel>
              <FormControl>
                <Dropdown
                  onChangeHandler={field.onChange}
                  value={field.value}
                  disabled={isPending}
                  type="industry"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Organization Size */}
        <FormField
          control={form.control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Size</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="STARTUP">Startup (1-50 employees)</SelectItem>
                  <SelectItem value="SME">SME (51-500 employees)</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise (500+ employees)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="City, Country"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your organization..."
                  className="h-28 resize-none"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Website */}
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Logo Upload */}
        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Logo</FormLabel>
              <FormControl>
                <FileUploader
                  image={field.value}
                  setFiles={setFiles}
                  onFieldChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormErrors message={error} />
        <FormSuccess message={success} />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? type === "Create"
              ? "Creating..."
              : "Updating..."
            : type === "Create"
              ? "Create Organization"
              : "Update Organization"}
        </Button>
      </form>
    </Form>
  );
};

export default OrganizationForm;
