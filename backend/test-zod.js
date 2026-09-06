const { z } = require('zod');

const schema = z.object({
  branchId: z.string().uuid("ID de sucursal inválido").optional().nullable().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

const res1 = schema.safeParse({ branchId: "" });
console.log("Empty string:", res1.success ? res1.data : res1.error.issues);

const res2 = schema.safeParse({});
console.log("Undefined:", res2.success ? res2.data : res2.error.issues);

const res3 = schema.safeParse({ branchId: null });
console.log("Null:", res3.success ? res3.data : res3.error.issues);
