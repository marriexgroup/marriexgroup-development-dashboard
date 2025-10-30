import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  useForgotPasswordMutation,
  useSetup2FARequestMutation,
  useSetup2FAVerifyMutation,
} from "@/hooks/use-auth";
import { forgotPasswordSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
type ForgotPasswordFormData = { email: string; otp?: string };

const ForgotPassword = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [setupData, setSetupData] = useState<
    | null
    | {
        secret: string;
        otpauth: string;
      }
  >(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const { mutate: forgotPassword, isPending } = useForgotPasswordMutation();
  const { mutate: setupRequest, isPending: isSetupReqPending } =
    useSetup2FARequestMutation();
  const { mutate: setupVerify, isPending: isSetupVerifyPending } =
    useSetup2FAVerifyMutation();

  const form = useForm<ForgotPasswordFormData>({
    resolver: (zodResolver as any)(forgotPasswordSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = (data) => {
    forgotPassword(data, {
      onSuccess: (resp: any) => {
        const token = resp?.token || resp?.data?.token;
        if (token) {
          setSetupData(null);
          navigate(`/reset-password?token=${encodeURIComponent(token)}`);
          return;
        }
        setIsSuccess(true);
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message;
        const otpProvided = !!(data.otp && data.otp.trim().length > 0);
        if (
          errorMessage === "Authenticator not enabled for this account" &&
          !otpProvided
        ) {
          const email = data.email;
          setupRequest(
            { email },
            {
              onSuccess: (res: any) => {
                const payload = res?.data || res;
                setSetupData({ secret: payload.secret, otpauth: payload.otpauth });
              },
              onError: (e: any) => {
                toast.error(e?.response?.data?.message || "Failed to start setup");
              },
            }
          );
          return;
        }
        console.log(error);
        toast.error(errorMessage);
      },
    });
  };

  const onSetupVerify = (email: string, otp: string) => {
    setupVerify(
      { email, otp },
      {
        onSuccess: () => {
          toast.success("Authenticator enabled. Enter a fresh code to continue.");
          setSetupData(null);
        },
        onError: (e: any) => {
          toast.error(e?.response?.data?.message || "Invalid code");
        },
      }
    );
  };

  useEffect(() => {
    let mounted = true;
    if (setupData?.otpauth) {
      QRCode.toDataURL(setupData.otpauth, { margin: 1, width: 192 })
        .then((url: string) => {
          if (mounted) setQrDataUrl(url);
        })
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
    return () => {
      mounted = false;
    };
  }, [setupData?.otpauth]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center space-y-2">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground">
            {setupData
              ? "Scan and verify to enable authenticator, then reset your password"
              : "Enter your email and authenticator code to reset your password"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <Link to="/sign-in" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <h1 className="text-2xl font-bold">
                  Password reset email sent
                </h1>
                <p className="text-muted-foreground">
                  Check your email for a link to reset your password
                </p>
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      name="email"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!setupData && (
                      <div className="text-xs text-muted-foreground -mt-2">
                        Don&apos;t have an authenticator yet? Use the button below to set it up.
                      </div>
                    )}

                    {setupData ? (
                      <div className="space-y-2 border rounded-md p-3">
                        <div className="text-sm">
                          <p className="font-semibold">Setup Authenticator</p>
                          <p className="text-muted-foreground">
                            Add a new account in your authenticator app using the
                            secret below. If your app supports it, paste this
                            otpauth URL.
                          </p>
                        </div>
                        {qrDataUrl && (
                          <div className="flex items-center justify-center py-2">
                            <img
                              src={qrDataUrl}
                              alt="Authenticator QR"
                              className="h-48 w-48"
                            />
                          </div>
                        )}
                        <div className="text-xs break-all">
                          <div className="font-mono">Secret: {setupData.secret}</div>
                          <div className="font-mono mt-1">URL: {setupData.otpauth}</div>
                        </div>

                        <FormField
                          name="otp"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter a code from your app</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="6-digit code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          className="w-full"
                          disabled={isSetupReqPending || isSetupVerifyPending}
                          onClick={() =>
                            {
                              const emailVal = form.getValues("email");
                              const otpVal = form.getValues("otp");
                              if (!otpVal) {
                                toast.error("Enter the 6-digit code from your app");
                                return;
                              }
                              onSetupVerify(emailVal, otpVal);
                            }
                          }
                        >
                          {isSetupVerifyPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Verify Authenticator"
                          )}
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          After verification, enter a fresh code and click Reset Password.
                        </div>
                      </div>
                    ) : (
                      <>
                        <FormField
                          name="otp"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Authenticator Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="6-digit code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          disabled={isSetupReqPending}
                          onClick={() => {
                            const email = form.getValues("email");
                            if (!email) {
                              toast.error("Please enter your email first");
                              return;
                            }
                            setupRequest(
                              { email },
                              {
                                onSuccess: (res: any) => {
                                  const payload = res?.data || res;
                                  setSetupData({ secret: payload.secret, otpauth: payload.otpauth });
                                },
                                onError: (e: any) => {
                                  toast.error(
                                    e?.response?.data?.message || "Failed to start setup"
                                  );
                                },
                              }
                            );
                          }}
                        >
                          {isSetupReqPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Set up Authenticator"
                          )}
                        </Button>
                      </>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
