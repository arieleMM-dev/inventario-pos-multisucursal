"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Camera, Save } from "lucide-react";

const profileSchema = z.object({
  phone: z.string().optional().nullable(),
  email: z.string().email("Correo inválido"),
  avatar: z.string().optional().nullable(),
});

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: user?.phone || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        phone: user.phone || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
  }, [user, form]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar los 2MB");
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError("Solo se permiten formatos JPG, PNG y WEBP");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue("avatar", reader.result as string, { shouldDirty: true });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    setError(null);
    setSuccess(false);
    try {
      const res = await api.patch("/users/profile", values);
      // Update local context
      if (token && user) {
        const updatedUser = { ...user, ...res.data.data };
        login(token, updatedUser);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Error al actualizar el perfil");
    }
  };

  const currentAvatar = form.watch("avatar");

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h2>
        
        {error && <div className="mb-6 p-3 bg-danger-bg text-danger-text rounded-md text-sm">{error}</div>}
        {success && <div className="mb-6 p-3 bg-brand-50 text-brand-700 rounded-md text-sm">Perfil actualizado exitosamente</div>}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-medium text-gray-400">{user?.name?.[0] || 'U'}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                />
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-left pt-2">
                <h3 className="font-medium text-gray-900">{user?.name}</h3>
                <p className="text-sm text-gray-500">{user?.role}</p>
                <p className="text-xs text-gray-400 mt-2">Permitido JPG, PNG o WEBP. Máx 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+52 123 456 7890" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
