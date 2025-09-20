'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Gavel, Loader2, Link, BookCopy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  distillLegalese,
  type DistillLegaleseOutput,
} from '@/ai/flows/distill-legalese';

const FormSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DistillLegaleseOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: 'https://9000-firebase-legalese-distiller2-1756125687827.cluster-y3k7ko3fang56qzieg3trwgyfg.cloudworkstations.dev',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setLoading(true);
    setResult(null);
    try {
      const res = await distillLegalese(data.url);
      setResult(res);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'Failed to distill the legalese. Please check the URL and try again.',
      });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#F0F4F5] flex flex-col items-center py-10 px-4">
      <header className="text-center mb-8">
        <div className="inline-block bg-primary/10 p-3 rounded-2xl mb-4">
          <Gavel className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
          LegalEagle
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Your AI-powered guide to understanding complex legal documents.
        </p>
      </header>

      <main className="w-full max-w-2xl">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Analyze a Document from a URL
            </CardTitle>
            <CardDescription>
              Enter the URL of a terms of service, privacy policy, or other
              legal document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/privacy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Distilling...
                    </>
                  ) : (
                    'Distill Legalese'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {result && (
          <Card className="mt-8 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Distillation Complete</CardTitle>
              <CardDescription>
                Here is a simplified summary of the document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion
                type="single"
                collapsible
                className="w-full"
                defaultValue="summary"
              >
                <AccordionItem value="summary">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <BookCopy className="w-5 h-5" />
                      Plain English Summary
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    {result.summary}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="obligations">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Gavel className="w-5 h-5" />
                      Your Obligations
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {result.obligations.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-2">
                        {result.obligations.map((item, i) => (
                          <li key={i} className="text-muted-foreground">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">
                        No specific obligations were identified.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="rights">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 text-accent">
                      <AlertTriangle className="w-5 h-5" />
                      Your Rights
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {result.rights.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-2">
                        {result.rights.map((item, i) => (
                          <li key={i} className="text-accent">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">
                        No specific rights were identified.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
