import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, categories);
  } catch (error) {
    console.error('Error en getCategories:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener categorías', 500);
  }
};

export const getCategoriesTree = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { children: true },
      orderBy: { name: 'asc' },
    });
    
    const categoryMap = new Map();
    categories.forEach(c => categoryMap.set(c.id, { ...c, children: [] }));
    
    const tree: any[] = [];
    categories.forEach(c => {
      if (c.parentId) {
        const parent = categoryMap.get(c.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(c.id));
        }
      } else {
        tree.push(categoryMap.get(c.id));
      }
    });

    return sendSuccess(res, tree);
  } catch (error) {
    console.error('Error en getCategoriesTree:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al obtener el árbol de categorías', 500);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const result = createCategorySchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues.map(i => ({ field: String(i.path[0]), message: i.message })));
    }
    const { name, parentId } = result.data;

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos duplicados', 400, [{ field: 'name', message: 'La categoría ya existe' }]);
    }

    if (parentId) {
      const parentExists = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parentExists) {
        return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, [{ field: 'parentId', message: 'La categoría padre no existe' }]);
      }
    }

    const category = await prisma.category.create({
      data: { name, parentId }
    });
    return sendSuccess(res, category, 201);
  } catch (error) {
    console.error('Error en createCategory:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al crear categoría', 500);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const result = updateCategorySchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, result.error.issues.map(i => ({ field: String(i.path[0]), message: i.message })));
    }
    const { name, parentId } = result.data;

    const existingName = await prisma.category.findUnique({ where: { name } });
    if (existingName && existingName.id !== id) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos duplicados', 400, [{ field: 'name', message: 'El nombre ya está en uso por otra categoría' }]);
    }

    if (parentId === id) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos inválidos', 400, [{ field: 'parentId', message: 'Una categoría no puede ser su propio padre' }]);
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, parentId }
    });
    return sendSuccess(res, category);
  } catch (error) {
    console.error('Error en updateCategory:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al actualizar categoría', 500);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.category.delete({
      where: { id }
    });
    return sendSuccess(res, { message: 'Categoría eliminada' });
  } catch (error: any) {
    console.error('Error en deleteCategory:', error);
    if (error.code === 'P2003') {
       return sendError(res, 'VALIDATION_ERROR', 'Conflicto', 400, [{ field: 'id', message: 'No se puede eliminar la categoría porque tiene productos asignados o subcategorías' }]);
    }
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Error al eliminar categoría', 500);
  }
};
