"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Language } from "@/types";

interface LoginScreenProps {
  language: Language;
  onLogin: (email: string) => void;
}

export function LoginScreen({ language, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError(language === "tr" ? "E-posta adresi gereklidir." : "Email is required.");
      return;
    }
    if (!trimmed.includes("@")) {
      setError(language === "tr" ? "Geçerli bir e-posta adresi giriniz." : "Enter a valid email address.");
      return;
    }
    if (!password) {
      setError(language === "tr" ? "Şifre gereklidir." : "Password is required.");
      return;
    }
    if (password !== "123456") {
      setError(language === "tr" ? "Şifre hatalı." : "Incorrect password.");
      return;
    }

    onLogin(trimmed);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto -mb-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full">
            <Image
              src="/logo.jpg"
              alt="Kuveyt Türk Logo"
              width={160}
              height={160}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-xl uppercase tracking-wide">
            {language === "tr" ? "Model Envanter Yönetimi" : "Model Inventory Management"}
          </CardTitle>
          <CardDescription className="sr-only">Login</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">
                {language === "tr" ? "Kurumsal E-posta" : "Corporate Email"}
              </Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="zahid.malkoc@kuveytturk.com.tr"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">
                {language === "tr" ? "Şifre" : "Password"}
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p className="text-sm font-medium text-red-600" role="alert">{error}</p>
            ) : null}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              <LogIn className="mr-2 h-4 w-4" />
              {language === "tr" ? "Giriş Yap" : "Sign In"}
            </Button>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">{language === "tr" ? "Not:" : "Note:"}</p>
              <p>E-posta: <span className="font-mono font-semibold">zahid.malkoc@kuveytturk.com.tr</span></p>
              <p>{language === "tr" ? "Şifre" : "Password"}: <span className="font-mono font-semibold">123456</span></p>
            </div>

            <p className="text-center text-[10px] text-slate-400 italic">
              {language === "tr"
                ? "Demo modu — Production ortamında LDAP/Active Directory ile kimlik doğrulama yapılır."
                : "Demo mode — Authenticates via LDAP/Active Directory in production."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
