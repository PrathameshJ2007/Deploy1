
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  File,
  Camera,
  Loader2,
  History,
  FileText,
  Zap,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  FileClock,
  Info,
  CircleDot,
  Badge,
  Download,
  FileJson,
  FileCode,
  Key,
  AlertTriangle,
  ClipboardList,
  Newspaper,
  Database,
  Crop,
  Check,
  Menu,
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  processDocument,
  type ProcessDocumentOutput,
} from '@/ai/flows/document-processor';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import getCroppedImg from '@/lib/crop-image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';


function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="hsl(var(--primary-foreground))"
        fontSize="18"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        T
      </text>
    </svg>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className="p-2 bg-primary/10 rounded-md">{icon}</div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

type ProcessingStepStatus = 'pending' | 'processing' | 'complete';

interface ProcessingStep {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: ProcessingStepStatus;
}

const initialProcessingSteps: ProcessingStep[] = [
    { key: 'upload', icon: <CheckCircle2 className="h-6 w-6 text-green-500" />, title: 'Upload Complete', description: 'Your document has been uploaded.', status: 'pending' },
    { key: 'ocr', icon: <FileClock className="h-6 w-6 text-primary" />, title: 'Processing Document', description: 'Extracting text and detecting layout.', status: 'pending' },
    { key: 'analysis', icon: <BrainCircuit className="h-6 w-6 text-primary" />, title: 'AI Analysis', description: 'Generating summaries and extracting key facts.', status: 'pending' },
    { key: 'quality', icon: <CircleDot className="h-6 w-6 text-muted-foreground" />, title: 'Finalizing', description: 'Validating results and preparing your report.', status: 'pending' },
];

function ProcessingStatus({ steps }: { steps: ProcessingStep[] }) {
    return (
        <div className="space-y-4">
            {steps.map((step) => (
                <Card
                    key={step.key}
                    className={cn('transition-all', {
                        'bg-green-500/10 border-green-500/20': step.status === 'complete',
                        'border-primary ring-2 ring-primary/50': step.status === 'processing',
                        'bg-card/50': step.status === 'pending',
                    })}
                >
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                {step.status === 'complete' ? <CheckCircle2 className="h-6 w-6 text-green-500" /> :
                                 step.status === 'processing' ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> :
                                 step.icon}
                            </div>
                            <div>
                                <p className="font-semibold">{step.title}</p>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                        <div
                            className={cn('text-xs font-semibold rounded-full px-2 py-1', {
                                'bg-green-500/20 text-green-500': step.status === 'complete',
                                'bg-primary/20 text-primary': step.status === 'processing',
                                'bg-muted/20 text-muted-foreground': step.status === 'pending',
                            })}
                        >
                            {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                            {step.status === 'processing' && '...'}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function CameraComponent({
  open,
  onClose,
  onPhotoTaken,
}: {
  open: boolean;
  onClose: () => void;
  onPhotoTaken: (dataUri: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      if (!open) {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
        return;
      }
      
      try {
        const videoConstraints: MediaStreamConstraints['video'] = {
          facingMode: 'environment' 
        };
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      } catch (err) {
        console.warn('Could not get environment camera, trying default', err);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use this feature.',
            });
            onClose();
            return;
        }
      }

      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    if (open) {
      getCameraPermission();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [open, onClose, toast]);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (capturedImage && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(capturedImage, croppedAreaPixels);
        if (croppedImage) {
          onPhotoTaken(croppedImage);
          resetAndClose();
        }
      } catch (e) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: 'Error Cropping Image',
            description: 'Could not crop the image. Please try again.',
        });
      }
    }
  };

  const resetAndClose = () => {
    setCapturedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && resetAndClose()}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{capturedImage ? 'Crop Your Photo' : 'Take a Photo'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative">
          {capturedImage ? (
            <div className="relative w-full h-full">
              <Cropper
                image={capturedImage}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-md"
              autoPlay
              muted
              playsInline
            />
          )}
        </div>
        {capturedImage && (
            <div className="flex items-center gap-4 p-4">
                <Crop className="w-5 h-5" />
                <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                />
            </div>
        )}
        <DialogFooter>
          {capturedImage ? (
            <>
              <Button variant="outline" onClick={() => setCapturedImage(null)}>
                Retake
              </Button>
              <Button onClick={handleCrop}>
                <Check className="mr-2" />
                Use Photo
              </Button>
            </>
          ) : (
            <Button onClick={handleCapture} disabled={!hasCameraPermission}>
              <Camera className="mr-2" />
              Capture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CitationItem = ({ text, citation }: { text: string; citation: string }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-2 border-b last:border-b-0 gap-2">
    <p className="text-muted-foreground flex-1">{text}</p>
    <div className="text-muted-foreground mt-1 md:mt-0">
      <BadgeComponent variant="secondary" className="whitespace-nowrap">{citation}</BadgeComponent>
    </div>
  </div>
);


export default function DocumentUploader() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessDocumentOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>(initialProcessingSteps);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const startAnalysis = async (dataUri: string, name: string) => {
    setFileName(name);
    setResult(null);
    setShowUploader(true);
    setLoading(true);
    setProcessingSteps(initialProcessingSteps);
    const newJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    setJobId(newJobId);

    // --- Visual Simulation ---
    // Step 1: Immediately show "Upload Complete" and start "Processing"
    setProcessingSteps(prev => {
        const newSteps = [...prev];
        newSteps[0].status = 'complete';
        newSteps[1].status = 'processing';
        return newSteps;
    });

    // Quick delay for visual feedback, then move to "AI Analysis"
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setProcessingSteps(prev => {
        const newSteps = [...prev];
        if(newSteps[1]) newSteps[1].status = 'complete';
        if(newSteps[2]) newSteps[2].status = 'processing';
        return newSteps;
    });

    // --- AI Call ---
    try {
        const analysisResult = await processDocument({ documentDataUri: dataUri });
        setResult(analysisResult);
    } catch (error) {
        console.error("AI Analysis failed:", error);
        toast({
            variant: 'destructive',
            title: 'An error occurred.',
            description: 'Failed to process the document. Please try again.',
        });
        resetState();
    } finally {
        setLoading(false);
        // Final step: Complete the UI
        setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));
    }
  };


  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const dataUri = reader.result as string;
        startAnalysis(dataUri, file.name);
    };
  };
  
  const handlePhotoTaken = (dataUri: string) => {
    startAnalysis(dataUri, `photo_${Date.now()}.jpg`);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const resetState = () => {
    setResult(null);
    setFileName(null);
    setLoading(false);
    setShowUploader(false);
    setProcessingSteps(initialProcessingSteps);
    setJobId(null);
  };

  const UploaderComponent = () => (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Upload Documents
        </h1>
        <p className="mt-2 text-muted-foreground">
          Drag and drop your legal documents or click to browse.
          We support PDFs and images (PNG, JPG, JPEG, WebP).
        </p>
      </div>

      <Card
        className="border-2 border-dashed bg-card shadow-none"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardContent className="p-10 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <UploadCloud className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Upload your documents</p>
              <p className="text-sm text-muted-foreground">
                Drag &amp; drop files here, or click to browse
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={handleBrowse} disabled={true}>
                <File className="mr-2" />
                Browse Files
              </Button>
              <Button variant="secondary" onClick={() => setIsCameraOpen(true)} disabled={true}>
                <Camera className="mr-2" />
                Take Photo
              </Button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/pdf,image/png,image/jpeg,image/webp"
          />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Supports PDF, PNG, JPG, JPEG, WebP • Max 50MB per file
      </p>
    </>
  );

  const ResultComponent = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analysis Complete</h1>
          <p className="text-muted-foreground text-sm">Job ID: {jobId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={resetState}>
            <UploadCloud className="mr-2 h-4 w-4" /> New Upload
          </Button>
        </div>
      </div>

      {/* Desktop: Tabs */}
      <div className="hidden md:block">
        <Tabs defaultValue="plain-english">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plain-english">
              <Newspaper className="mr-2 h-4 w-4" /> Plain English
            </TabsTrigger>
            <TabsTrigger value="key-facts">
              <Key className="mr-2 h-4 w-4" /> Key Facts
            </TabsTrigger>
            <TabsTrigger value="risks-fees">
              <AlertTriangle className="mr-2 h-4 w-4" /> Risks & Fees
            </TabsTrigger>
            <TabsTrigger value="to-do">
              <ClipboardList className="mr-2 h-4 w-4" /> To-Do Items
            </TabsTrigger>
          </TabsList>
          <TabsContent value="plain-english">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Newspaper /> Plain English Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{result!.summary}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="key-facts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Key /> Key Facts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result!.keyFacts.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {result!.keyFacts.map((fact, index) => (
                      <CitationItem key={index} text={fact.fact} citation={fact.citation} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No key facts were extracted.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="risks-fees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle /> Risks & Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result!.risksAndFees.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {result!.risksAndFees.map((risk, index) => (
                       <CitationItem key={index} text={risk.description} citation={risk.citation} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No risks or fees were identified.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="to-do">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ClipboardList /> To-Do Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result!.toDoItems.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {result!.toDoItems.map((item, index) => (
                      <CitationItem key={index} text={item.item} citation={item.citation} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No to-do items were found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: Accordion */}
      <div className="md:hidden">
        <Accordion type="single" collapsible defaultValue="plain-english" className="w-full space-y-4">
          <AccordionItem value="plain-english" className="border rounded-lg">
            <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
              <div className="flex items-center gap-2">
                <Newspaper /> Plain English Summary
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              <p className="text-muted-foreground">{result!.summary}</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="key-facts" className="border rounded-lg">
            <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
              <div className="flex items-center gap-2">
                <Key /> Key Facts
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              {result!.keyFacts.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {result!.keyFacts.map((fact, index) => (
                    <CitationItem key={index} text={fact.fact} citation={fact.citation} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No key facts were extracted.</p>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="risks-fees" className="border rounded-lg">
            <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle /> Risks & Fees
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              {result!.risksAndFees.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {result!.risksAndFees.map((risk, index) => (
                     <CitationItem key={index} text={risk.description} citation={risk.citation} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No risks or fees were identified.</p>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="to-do" className="border-b-0 border rounded-lg">
            <AccordionTrigger className="p-4 font-semibold text-lg hover:no-underline">
              <div className="flex items-center gap-2">
                <ClipboardList /> To-Do Items
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
              {result!.toDoItems.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {result!.toDoItems.map((item, index) => (
                    <CitationItem key={index} text={item.item} citation={item.citation} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No to-do items were found.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/" className="hidden items-center gap-2 sm:flex">
            <Logo />
            <span className="sr-only">Titan Neural Network</span>
          </Link>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold">Titan Neural Network</h1>
            <p className="text-sm text-muted-foreground">
              Document Intelligence Platform
            </p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Button variant="link" className="text-foreground" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="link" className="text-muted-foreground" asChild>
            <Link href="/history">
              <History className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">A list of links to navigate the site.</SheetDescription>
            </SheetHeader>
            <nav className="grid gap-6 text-lg font-medium mt-4">
              <Link
                href="#"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Logo />
                <span>Titan Neural Network</span>
              </Link>
              <Link href="/" className="text-foreground">
                Home
              </Link>
              <Link href="/history" className="text-muted-foreground">
                History
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:px-6 lg:py-12">
        <div className="mx-auto max-w-4xl px-4">
          {showUploader ? (
              <>
              {(loading || result) ? null : <UploaderComponent />}
              {loading && <ProcessingStatus steps={processingSteps} />}
              {!loading && result && <ResultComponent />}
              </>
          ) : (
            <div className="text-center">
              <div className="inline-block p-3 mb-4 bg-primary/10 rounded-lg">
                 <BrainCircuit className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                Titanium-Grade
                <br />
                <span className="text-primary">Document Clarity</span>
              </h1>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-lg">
                Transform complex legal documents into clear, actionable insights. Our AI extracts key facts, identifies risks, and highlights what you need to do next.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" onClick={() => setShowUploader(true)} disabled={true}>
                  <UploadCloud className="mr-2"/>
                  Upload Documents
                </Button>
                <Button size="lg" variant="outline" asChild>
                   <Link href="/history">
                    <History className="mr-2"/>
                    View History
                   </Link>
                </Button>
              </div>
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<Zap className="text-blue-400" />}
                    title="Lightning Fast OCR"
                    description="Advanced OCR with auto-cleaning, deskewing, and multi-language support extracts text with exceptional accuracy."
                />
                <FeatureCard 
                    icon={<BrainCircuit className="text-green-400" />}
                    title="AI-Powered Analysis"
                    description="Our neural network understands document structure, extracts key facts, and identifies potential risks in plain English."
                />
                <FeatureCard 
                    icon={<ShieldCheck className="text-purple-400" />}
                    title="Secure & Private"
                    description="Your documents are processed securely with optional PII redaction and enterprise-grade data protection."
                />
              </div>
            </div>
          )}
        </div>
      </main>
      <CameraComponent open={isCameraOpen} onClose={() => setIsCameraOpen(false)} onPhotoTaken={handlePhotoTaken} />
    </div>
  );
}
