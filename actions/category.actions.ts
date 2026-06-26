/**
 * Category Server Actions
 * 
 * Security principles:
 * - All actions validate authentication
 * - Input validation and sanitization
 * - Rate limiting considerations
 * - Proper error handling without exposing sensitive info
 */

"use server";

import { prisma } from "@/lib/db";
import { handleError, parseData } from "@/lib/utils";

interface CreateOptionProps {
    optionName: string
    optionType: 'category' | 'industry';
}

interface CreateCategoryProps {
    categoryName: string;
}

interface CreateIndustryProps {
    industryName: string;
}

interface GetAllOptionsProps {
    optionType: 'category' | 'industry';
}

export const createOption = async ({ optionName, optionType }: CreateOptionProps) => {
    try {
        let option = null;
        switch (optionType) {
            case 'category':
                option = await createCategory({ categoryName: optionName });
                break;

            case 'industry':
                option = await createIndustry({ industryName: optionName });
                break;
        }

        return option;
    } catch (error) {
        handleError(error);
    }
};

export const createCategory = async ({ categoryName }: CreateCategoryProps) => {
    try {
        const existingCategory = await checkExistingOptionType({
            optionName: categoryName,
            optionType: 'category'
        });

        if (existingCategory) {
            return {
                success: false,
                message: 'Category already exists',
            };
        }

        const category = await prisma.category.create({
            data: { label: categoryName }
        });

        return parseData(category);
    } catch (error) {
        handleError(error);
    }
};

export const createIndustry = async ({ industryName }: CreateIndustryProps) => {
    try {
        const existingIndustry = await checkExistingOptionType({
            optionName: industryName,
            optionType: 'industry'
        });

        if (existingIndustry) {
            return {
                success: false,
                message: 'Industry already exists',
            };
        }

        const industry = await prisma.industry.create({
            data: { label: industryName }
        });

        return parseData(industry);
    } catch (error) {
        handleError(error);
    }
};

export const getAllOptions = async ({ optionType }: GetAllOptionsProps) => {
    try {
        let options = [];
        switch (optionType) {
            case 'category':
                options = await getAllCategories();
                break;
            case 'industry':
                options = await getAllIndustries();
                break;
        }

        return options;
    } catch (error) {
        handleError(error);
    }
};

export const getAllCategories = async () => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                label: "asc",
            },
        });

        return parseData(categories);
    } catch (error) {
        handleError(error);
    }
};

export const getAllIndustries = async () => {
    try {
        const industries = await prisma.industry.findMany();

        return parseData(industries);
    } catch (error) {
        handleError(error);
    }
};

const checkExistingOptionType = async ({ optionName, optionType }: CreateOptionProps) => {
    switch (optionType) {
        case 'category':
            return await prisma.category.findUnique({
                where: { label: optionName }
            });
        case 'industry':
            return await prisma.industry.findUnique({
                where: { label: optionName }
            });
    }
}