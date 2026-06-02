import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check if recovery parameters exist in hash or search query
    const hasRecoveryParams = 
      window.location.hash.includes("access_token") || 
      window.location.hash.includes("type=recovery") ||
      window.location.search.includes("access_token") ||
      window.location.search.includes("type=recovery");

    if (hasRecoveryParams) {
      setReady(true);
      return;
    }

    // 2. Check if the Supabase client already has an active session (e.g. parsed the tokens)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    // 3. Listen to auth state changes for PASSWORD_RECOVERY or SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // 4. Timeout safety fallback: If not verified in 4 seconds, show helpful links
    const timer = setTimeout(() => {
      // Check one last time before showing error
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
        } else {
          setErrorText("We couldn't verify your password reset session. Your link may have expired or is invalid.");
        }
      });
    }, 4000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      // Standard flow: sign out of recovery session and send to login
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    }
  };

  if (errorText) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="mb-6">
            <img
              src="/logo.webp"
              alt="AI Cloud Hub Logo"
              className="w-20 h-20 object-contain drop-shadow-lg mx-auto"
            />
          </div>
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="font-heading text-destructive text-lg">Verification Failed</CardTitle>
              <CardDescription className="text-sm mt-2">{errorText}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3">
              <Link to="/forgot-password" className="w-full">
                <Button className="w-full gradient-primary text-primary-foreground">
                  Request New Link
                </Button>
              </Link>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Back to Login
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <img
              src="/logo.webp"
              alt="AI Cloud Hub Logo"
              className="w-20 h-20 object-contain drop-shadow-lg mx-auto"
            />
          </div>
          <Card className="shadow-card border-border/50">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Validating reset link & initializing session...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-2">
            <img
              src="/logo.webp"
              alt="AI Cloud Hub Logo"
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">AI Cloud Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
        </div>
        <Card className="shadow-card border-border/50">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="font-heading">Reset Password</CardTitle>
              <CardDescription>Choose a new password for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl h-12 shadow-neu-inset bg-muted/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl h-12 shadow-neu-inset bg-muted/30"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full rounded-xl h-12 gradient-primary text-primary-foreground font-semibold text-base" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
