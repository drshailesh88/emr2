import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Doctor Secretary AI</CardTitle>
          <CardDescription>
            AI-powered medical secretary for solo doctors in India
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <a href="/login">Login</a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/signup">Sign Up</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
