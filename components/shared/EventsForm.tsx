"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventCreateSchema } from "@/lib/validation";
import { z } from "zod";
import axios from "axios";
import { Input } from "@/components/ui/input";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormErrors } from "@/components/FormErrors";
import { FormSuccess } from "@/components/FormSuccess";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/shared/Dropdown";
import { Textarea } from "@/components/ui/textarea";
import FileUploader from "@/components/shared/FileUploader";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Checkbox } from "@/components/ui/checkbox";
import { handleUpload } from "@/lib/file-uploader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
	CalendarDays,
	CircleDollarSign,
	Globe,
	Link2,
	MapPin,
	Zap,
} from "lucide-react";
import { AIWriterButton } from "@/components/ai/AIWriterButton";

interface EventsFormProps {
	userId: string;
	type: "Create" | "Update";
	organizationId?: string;
	organizationName?: string;
	eventId?: string;
	initialData?: {
		title: string;
		description: string;
		location: string;
		startDateTime: Date;
		endDateTime: Date;
		categoryId: string;
		price: string;
		isFree: boolean;
		url: string;
		visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
		eventType: "ONLINE" | "OFFLINE" | "HYBRID";
		maxAttendees?: number;
		image: string | null;
		currency?: "USD" | "INR";
	};
}

const EventsForm = ({
	userId,
	type,
	organizationId,
	organizationName,
	eventId,
	initialData,
	defaultCurrency = "USD",
}: EventsFormProps & { defaultCurrency?: "USD" | "INR" }) => {
	const [errors, setErrors] = useState("");
	const [success, setSuccess] = useState("");
	const [files, setFiles] = useState<File[]>([]);

	const router = useRouter();

	const form = useForm<z.infer<typeof EventCreateSchema>>({
		resolver: zodResolver(EventCreateSchema),
		defaultValues: initialData
			? {
					title: initialData.title,
					description: initialData.description,
					location: initialData.location,
					image: null,
					startDateTime: new Date(initialData.startDateTime),
					endDateTime: new Date(initialData.endDateTime),
					categoryId: initialData.categoryId,
					price: initialData.price,
					isFree: initialData.isFree,
					url: initialData.url || "",
					visibility: initialData.visibility,
					eventType: initialData.eventType,
					maxAttendees: initialData.maxAttendees,
					currency: initialData.currency ?? defaultCurrency,
				}
			: {
					title: "",
					description: "",
					location: "",
					image: null,
					startDateTime: new Date(),
					endDateTime: new Date(),
					categoryId: "",
					price: "",
					isFree: false,
					url: "",
					visibility: "PUBLIC",
					eventType: "OFFLINE",
					maxAttendees: undefined,
					currency: defaultCurrency,
				},
	});

	const onSubmit = async (values: z.infer<typeof EventCreateSchema>) => {
		setErrors("");
		setSuccess("");

		// For edit mode, image is optional if initialData has image
		if (files.length === 0 && !initialData?.image) {
			setErrors("Please upload an image");
			return;
		}

		if (!organizationId) {
			setErrors("You must belong to an organization to create events");
			return;
		}

		// Upload new image or use existing
		let imageUrl = initialData?.image || "";
		if (files.length > 0) {
			const uploadResult = await handleUpload(files, "EVENT_IMAGE");
			if (!uploadResult?.imageUrl) {
				setErrors("Image upload failed");
				return;
			}
			imageUrl = uploadResult.imageUrl;
		}

		const finalValues = { ...values, userId, organizationId, imageUrl };

		if (type === "Create") {
			await axios
				.post("/api/events", finalValues, {
					headers: {
						"Content-Type": "application/json",
					},
				})
				.then((response) => {
					setSuccess(response.data.message);
					form.reset();
					router.push(`/events/${response.data.eventId}`);
				})
				.catch((error: any) => {
					const errMessage = error.response?.data?.error || error.message;
					setErrors(errMessage);
				});
		} else if (type === "Update" && eventId) {
			await axios
				.put(`/api/events/${eventId}`, finalValues, {
					headers: {
						"Content-Type": "application/json",
					},
				})
				.then((response) => {
					setSuccess(response.data.message);
					router.push(`/events/${eventId}`);
					router.refresh();
				})
				.catch((error: any) => {
					const errMessage = error.response?.data?.error || error.message;
					setErrors(errMessage);
				});
		}
	};

	return (
		<>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="mx-auto flex max-w-5xl flex-col gap-6 rounded-2xl border border-nx-outline-variant/30 bg-nx-surface-container-lowest p-4 text-nx-on-surface shadow-nx-card sm:p-6 lg:p-8"
				>
					{/* Organization Display */}
					{organizationName && (
						<div className="rounded-xl border border-nx-outline-variant/30 bg-nx-surface-container-low p-4">
							<p className="font-label text-sm text-nx-on-surface-variant">
								Hosting Organization
							</p>
							<p className="font-headline text-lg font-semibold">
								{organizationName}
							</p>
						</div>
					)}

					{/* Title and Category */}
					<div className="flex flex-col gap-5 md:flex-row">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormControl>
										<Input
											{...field}
											className="h-[54px] rounded-xl border-nx-outline-variant bg-nx-surface-container-low px-4 text-nx-on-surface placeholder:text-nx-on-surface-variant/60 focus-visible:ring-nx-primary/20"
											placeholder="Event title"
											type="text"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="categoryId"
							render={({ field }) => (
								<FormItem className="w-full [&_[role=combobox]]:rounded-xl">
									<Dropdown
										onChangeHandler={field.onChange}
										value={field.value}
									></Dropdown>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Description and Image */}
					<div className="flex flex-col md:flex-row gap-5">
						<div className="flex flex-col gap-2 w-full">
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormControl>
											<Textarea
												{...field}
												className="h-52 rounded-xl border-nx-outline-variant bg-nx-surface-container-low px-4 py-3 text-nx-on-surface placeholder:text-nx-on-surface-variant/60 focus-visible:ring-nx-primary/20"
												placeholder="Description"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{/* AI Writer — only available when org context is present */}
							{organizationId && (
								<AIWriterButton
									orgId={organizationId}
									eventId={eventId}
									currentDraft={form.watch("description")}
									onAccept={(generated) =>
										form.setValue("description", generated, {
											shouldValidate: true,
										})
									}
								/>
							)}
						</div>

						<FormField
							control={form.control}
							name="image"
							render={({ field }) => (
								<FormItem className="w-full [&>div]:rounded-xl [&>div]:border-nx-outline-variant [&>div]:bg-nx-surface-container-low [&>div:hover]:border-nx-primary [&_p]:text-nx-on-surface-variant [&_span]:text-nx-primary [&_svg]:text-nx-on-surface-variant [&_button]:bg-nx-error [&_button]:text-nx-on-error">
									<FormControl>
										<FileUploader
											onFieldChange={field.onChange}
											image={field.value}
											setFiles={setFiles}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Event Type */}
					<FormField
						control={form.control}
						name="eventType"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="font-headline text-base font-semibold text-nx-on-surface">
									Event Type
								</FormLabel>
								<FormControl>
									<RadioGroup
										onValueChange={field.onChange}
										defaultValue={field.value}
										className="grid grid-cols-1 gap-3 sm:grid-cols-3"
									>
										<div className="flex cursor-pointer items-center space-x-2 rounded-xl border border-nx-outline-variant/50 bg-nx-surface-container-low p-3 transition-colors hover:bg-nx-surface-container">
											<RadioGroupItem value="ONLINE" id="online" />
											<Label
												htmlFor="online"
												className="flex items-center gap-2 cursor-pointer"
											>
												<Globe className="w-4 h-4 text-nx-primary" />
												<span>Online</span>
											</Label>
										</div>
										<div className="flex cursor-pointer items-center space-x-2 rounded-xl border border-nx-outline-variant/50 bg-nx-surface-container-low p-3 transition-colors hover:bg-nx-surface-container">
											<RadioGroupItem value="OFFLINE" id="offline" />
											<Label
												htmlFor="offline"
												className="flex items-center gap-2 cursor-pointer"
											>
												<MapPin className="w-4 h-4 text-nx-primary" />
												<span>Offline</span>
											</Label>
										</div>
										<div className="flex cursor-pointer items-center space-x-2 rounded-xl border border-nx-outline-variant/50 bg-nx-surface-container-low p-3 transition-colors hover:bg-nx-surface-container">
											<RadioGroupItem value="HYBRID" id="hybrid" />
											<Label
												htmlFor="hybrid"
												className="flex items-center gap-2 cursor-pointer"
											>
												<Zap className="w-4 h-4 text-nx-primary" />
												<span>Hybrid</span>
											</Label>
										</div>
									</RadioGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Location */}
					<div className="flex flex-col md:flex-row gap-5">
						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormControl>
										<div className="flex h-[54px] w-full items-center rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-4 py-2 focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/15">
											<MapPin
												className="h-5 w-5 shrink-0 text-nx-on-surface-variant"
												aria-hidden="true"
											/>
											<Input
												{...field}
												className="h-auto border-0 bg-transparent text-nx-on-surface shadow-none placeholder:text-nx-on-surface-variant/60 focus-visible:ring-0"
												placeholder="Event location or meeting link"
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Start and End DateTime */}
					<div className="flex flex-col md:flex-row gap-5">
						<FormField
							control={form.control}
							name="startDateTime"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormControl>
										<div className="flex h-[54px] w-full items-center rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-4 py-2 focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/15">
											<CalendarDays
												className="h-5 w-5 shrink-0 text-nx-on-surface-variant"
												aria-hidden="true"
											/>
											<p className="ml-3 whitespace-nowrap font-label text-sm text-nx-on-surface-variant">
												Start Date
											</p>
											<DatePicker
												selected={field.value}
												onChange={(date: Date | null) =>
													field.onChange(date || new Date())
												}
												showTimeSelect
												timeInputLabel="Time"
												dateFormat="MM/dd/yyyy h:mm aa"
												wrapperClassName="datePicker"
												calendarClassName="!border-nx-outline-variant !bg-nx-surface-container-lowest !font-body !text-nx-on-surface [&_.react-datepicker__header]:!border-nx-outline-variant [&_.react-datepicker__header]:!bg-nx-surface-container [&_.react-datepicker__current-month]:!text-nx-on-surface [&_.react-datepicker__day-name]:!text-nx-on-surface-variant [&_.react-datepicker__day]:!text-nx-on-surface [&_.react-datepicker__day:hover]:!bg-nx-surface-container-high [&_.react-datepicker__time-container]:!border-nx-outline-variant [&_.react-datepicker__time]:!bg-nx-surface-container-lowest [&_.react-datepicker__time-list-item:hover]:!bg-nx-surface-container-high"
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="endDateTime"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormControl>
										<div className="flex h-[54px] w-full items-center rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-4 py-2 focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/15">
											<CalendarDays
												className="h-5 w-5 shrink-0 text-nx-on-surface-variant"
												aria-hidden="true"
											/>
											<p className="ml-3 whitespace-nowrap font-label text-sm text-nx-on-surface-variant">
												End Date
											</p>
											<DatePicker
												selected={field.value}
												onChange={(date: Date | null) =>
													field.onChange(date || new Date())
												}
												showTimeSelect
												timeInputLabel="Time"
												dateFormat="MM/dd/yyyy h:mm aa"
												wrapperClassName="datePicker"
												calendarClassName="!border-nx-outline-variant !bg-nx-surface-container-lowest !font-body !text-nx-on-surface [&_.react-datepicker__header]:!border-nx-outline-variant [&_.react-datepicker__header]:!bg-nx-surface-container [&_.react-datepicker__current-month]:!text-nx-on-surface [&_.react-datepicker__day-name]:!text-nx-on-surface-variant [&_.react-datepicker__day]:!text-nx-on-surface [&_.react-datepicker__day:hover]:!bg-nx-surface-container-high [&_.react-datepicker__time-container]:!border-nx-outline-variant [&_.react-datepicker__time]:!bg-nx-surface-container-lowest [&_.react-datepicker__time-list-item:hover]:!bg-nx-surface-container-high"
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Event Visibility */}
					<FormField
						control={form.control}
						name="visibility"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="font-headline text-base font-semibold text-nx-on-surface">
									Event Visibility
								</FormLabel>
								<FormControl>
									<RadioGroup
										onValueChange={field.onChange}
										defaultValue={field.value}
										className="flex flex-col gap-3"
									>
										<div className="flex cursor-pointer items-center space-x-2 rounded-xl border border-nx-outline-variant/50 bg-nx-surface-container-low p-3 transition-colors hover:bg-nx-surface-container">
											<RadioGroupItem value="PUBLIC" id="public" />
											<Label htmlFor="public" className="cursor-pointer flex-1">
												<div>
													<p className="font-medium">Public</p>
													<p className="text-sm text-nx-on-surface-variant">
														Anyone can see and join this event
													</p>
												</div>
											</Label>
										</div>
										<div className="flex cursor-pointer items-center space-x-2 rounded-xl border border-nx-outline-variant/50 bg-nx-surface-container-low p-3 transition-colors hover:bg-nx-surface-container">
											<RadioGroupItem value="PRIVATE" id="private" />
											<Label
												htmlFor="private"
												className="cursor-pointer flex-1"
											>
												<div>
													<p className="font-medium">Private</p>
													<p className="text-sm text-nx-on-surface-variant">
														Only organization members can see and join
													</p>
												</div>
											</Label>
										</div>
										<div className="flex cursor-pointer items-center space-x-2 rounded-xl border border-nx-outline-variant/50 bg-nx-surface-container-low p-3 transition-colors hover:bg-nx-surface-container">
											<RadioGroupItem value="INVITE_ONLY" id="invite-only" />
											<Label
												htmlFor="invite-only"
												className="cursor-pointer flex-1"
											>
												<div>
													<p className="font-medium">Invite Only</p>
													<p className="text-sm text-nx-on-surface-variant">
														Only invited users can see and join
													</p>
												</div>
											</Label>
										</div>
									</RadioGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Max Attendees */}
					<FormField
						control={form.control}
						name="maxAttendees"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel className="font-headline text-nx-on-surface">
									Capacity Limit (Optional)
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="number"
										placeholder="Maximum number of attendees"
										className="h-[54px] rounded-xl border-nx-outline-variant bg-nx-surface-container-low px-4 text-nx-on-surface placeholder:text-nx-on-surface-variant/60 focus-visible:ring-nx-primary/20"
										onChange={(e) => {
											const value = e.target.value;
											field.onChange(
												value === "" ? undefined : parseInt(value),
											);
										}}
										value={field.value || ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Price and URL */}
					<div className="flex flex-col gap-5 md:flex-row">
						<FormField
							control={form.control}
							name="price"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormControl>
										<div className="flex min-h-[54px] w-full flex-wrap items-center gap-y-2 rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-4 py-2 focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/15 sm:flex-nowrap">
											<CircleDollarSign
												className="h-5 w-5 shrink-0 text-nx-on-surface-variant"
												aria-hidden="true"
											/>
											<Input
												{...field}
												type="number"
												placeholder="Price"
												className="min-w-24 flex-1 border-0 bg-transparent text-nx-on-surface shadow-none placeholder:text-nx-on-surface-variant/60 focus-visible:ring-0"
											/>
											<FormField
												control={form.control}
												name="currency"
												render={({ field: currencyField }) => (
													<select
														className="bg-transparent pr-2 text-sm text-nx-on-surface outline-none"
														value={currencyField.value}
														onChange={currencyField.onChange}
														aria-label="Ticket currency"
													>
														<option
															className="bg-nx-surface-container-lowest text-nx-on-surface"
															value="USD"
														>
															USD
														</option>
														<option
															className="bg-nx-surface-container-lowest text-nx-on-surface"
															value="INR"
														>
															INR
														</option>
													</select>
												)}
											/>
											<FormField
												control={form.control}
												name="isFree"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<div className="flex items-center">
																<label
																	htmlFor="isFree"
																	className="whitespace-nowrap pr-3 text-sm leading-none text-nx-on-surface peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
																>
																	Free Ticket
																</label>
																<Checkbox
																	onCheckedChange={field.onChange}
																	checked={field.value}
																	id="isFree"
																	className="mr-2 h-5 w-5 border-2 border-nx-outline"
																/>
															</div>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="url"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormControl>
										<div className="flex h-[54px] w-full items-center rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-4 py-2 focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/15">
											<Link2
												className="h-5 w-5 shrink-0 text-nx-on-surface-variant"
												aria-hidden="true"
											/>
											<Input
												{...field}
												className="h-auto border-0 bg-transparent text-nx-on-surface shadow-none placeholder:text-nx-on-surface-variant/60 focus-visible:ring-0"
												placeholder="Event URL (optional)"
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormErrors message={errors} />
					<FormSuccess message={success} />
					<Button
						className="col-span-2 h-[54px] w-full rounded-xl font-label font-semibold"
						disabled={form.formState.isSubmitting}
						size="lg"
						type="submit"
					>
						{form.formState.isSubmitting ? "Submitting..." : `${type} Event`}
					</Button>
				</form>
			</Form>
		</>
	);
};

export default EventsForm;
