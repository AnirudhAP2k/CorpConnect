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
import { createOption, getAllOptions } from '@/actions/category.actions';
import { OptionsTypes } from '@/lib/types';

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
            .then((option) => {
                setOptions((prevSate) => [...prevSate, option]);
                setNewOption('');
                setOpen(false);
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
            <SelectTrigger className="select-field">
                <SelectValue placeholder={`${type || 'category'}`} />
            </SelectTrigger>
            <SelectContent>
                {options.length > 0 && options.map((option) => (
                    <SelectItem
                        key={option.id}
                        value={option.id}
                        className="select-item p-regular-14"
                    >
                        {option.label}
                    </SelectItem>

                ))}

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger className="p-medium-14 flex w-full rounded-sm py-3 pl-8 text-primary-500 hover:bg-primary-50 focus:text-primary-500">Add new {type || 'category'}</DialogTrigger>
                    <DialogContent className="bg-white">
                        <DialogHeader>
                            <DialogTitle>New {type || 'category'}</DialogTitle>
                            <DialogDescription>
                                Enter a name for the new {type || 'category'}.
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            type="text"
                            placeholder={`${type || 'category'} name`}
                            className="input-field mt-1"
                            value={newOption}
                            onChange={(e) => { setNewOption(e.target.value) }}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={() => { startTransition(handleAddOption) }}>Add</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SelectContent>
        </Select>
    )
}

export default Dropdown
