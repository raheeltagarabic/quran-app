import { useAuth } from "@workspace/replit-auth-web";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
      
      <div className="relative z-10 max-w-md w-full px-6">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl shadow-primary/5 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25 mb-6">
            <BookOpen className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">Quran Qaida</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Welcome to the 1-on-1 Class Management System.
          </p>
          
          <Button 
            onClick={login} 
            size="lg" 
            className="w-full text-lg h-14 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Log in with Replit
          </Button>
        </div>
      </div>
    </div>
  );
}
