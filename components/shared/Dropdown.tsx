import React, { startTransition, useEffect, useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createOption, getAllOptions, OptionsType } from '@/actions/category.actions';
import { OptionsTypes } from '@/lib/types';
import { toast } from 'sonner';

interface DropdownProps {
    value: string
    onChangeHandler?: () => void
    type?: 'category' | 'industry'
    disabled?: boolean
}

const Dropdown = ({ value, onChangeHandler, type, disabled }: DropdownProps) => {
    const [options, setOptions] = useState<OptionsTypes[]>([]);
    const [newOption, setNewOption] = useState('');
    const [open, setOpen] = useState(false);

    const handleAddOption = async () => {
        await createOption({
            optionName: newOption.trim(),
            optionType: type || 'category'
        })
            .then((result) => {
                if (!result.success) {
                    toast.error(result?.message || 'Failed to add new option');
                    return;
                }

                const newOption = result.data as OptionsType;
                setOptions((prevSate) => [...prevSate, newOption]);
                setNewOption('');
                setOpen(false);
                toast.success(`${type || 'option'} added successfully!`);
            })
            .catch((error) => {
                toast.error(error.message);
            })
    }

    useEffect(() => {
        const getOptions = async () => {
            const optionList = await getAllOptions({ optionType: type || 'category' });

            optionList && setOptions(optionList as OptionsTypes[]);
        }

        getOptions();
    }, []);

    return (
        <Select onValueChange={onChangeHandler} defaultValue={value} disabled={disabled}>
            <SelectTrigger className="h-[54px] rounded-xl border-nx-outline-variant bg-nx-surface-container-low font-body text-nx-on-surface focus:ring-nx-primary/20">
                <SelectValue placeholder={`${type || 'category'}`} />
            </SelectTrigger>
            <SelectContent>
                {options.length > 0 && options.map((option) => (
                    <SelectItem
                        key={option.id}
                        value={option.id}
                        className="rounded-lg font-body text-sm text-nx-on-surface focus:bg-nx-surface-container-high focus:text-nx-on-surface"
                    >
                        {option.label}
                    </SelectItem>

                ))}

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger className="flex w-full rounded-xl py-3 pl-8 font-label text-sm font-medium text-nx-primary hover:bg-nx-surface-container focus:text-nx-primary">Add new {type || 'category'}</DialogTrigger>
                    <DialogContent className="rounded-2xl border-nx-outline-variant/30 bg-nx-surface-container-lowest text-nx-on-surface">
                        <DialogHeader>
                            <DialogTitle>New {type || 'category'}</DialogTitle>
                            <DialogDescription>
                                Enter a name for the new {type || 'category'}.
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            type="text"
                            placeholder={`${type || 'category'} name`}
                            className="mt-1 rounded-xl border-nx-outline-variant bg-nx-surface-container-low text-nx-on-surface placeholder:text-nx-on-surface-variant/60 focus-visible:ring-nx-primary/20"
                            value={newOption}
                            onChange={(e) => { setNewOption(e.target.value) }}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" className="rounded-xl font-label">Cancel</Button>
                            </DialogClose>
                            <Button className="rounded-xl font-label" onClick={() => { startTransition(handleAddOption) }}>Add</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SelectContent>
        </Select>
    )
}

export default Dropdown
