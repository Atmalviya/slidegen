"use client";
import { Loader2, VideoIcon } from "lucide-react";
import React, { useState } from "react";
import MaxWidthWrapper from "./common/MaxWidthWrapper";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { generatePowerPoint } from "@/app/generate/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
const GenerateForm = () => {
  const { toast } = useToast();
  const route = useRouter();

  const [url, setUrl] = useState<string | null>("");
  const [isValide, setIsValide] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const validateYoutubeUrl = (url: string) => {
    const pattern =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return pattern.test(url);
  };

  const getVideoId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    return match ? match[1] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newURl = e.target.value.trim();
    if (!newURl) {
      setError(null);
      setIsValide(false);
      setUrl(null);
      return;
    }
    setUrl(newURl);
    const videoId = getVideoId(newURl);
    if (validateYoutubeUrl(newURl) && videoId) {
      setError("");
      setIsValide(true);
    } else {
      setError("Invalid YouTube URL");
      setIsValide(false);
    }
  };

  const handleGenerate = async () => {
    if (!url) {
      setError("Enter a Youtube URL");
      return;
    }
    if (!isValide) {
      setError("Invalid Youtube URL");
      return;
    }
    setError(null);
    const videoId = getVideoId(url || "");
    if (!videoId) {
      setError("Invalid youtube URL");
      return;
    }
    setLoading(true);
    try {
      console.log("videoId", videoId);
      const res = await generatePowerPoint(videoId);

      if (res.success) {
        setLoading(false);
        toast({
          title: "Presentation generated successfully",
          description: "Redirecting to dashboard",
          variant: "default",
          duration: 5000,
        });
        route.push("/dashboard");
      } else {
        setLoading(false);
        toast({
          title: "Error generating presentation",
          description: "Please try again later",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-12">
      <MaxWidthWrapper>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
            Create beautiful presentation{" "}
            <span className="block text-lg font-normal text-gray-600">
              from YouTube videos into professional Powerpoint.
            </span>
          </h1>
          <Card className="p-8 shadow-xl bg-white/80 backdrop-blur-sm border-0">
            {isValide ? (
              <div className="mb-8 aspect-video rounded-xl overflow-hidden shadow-lg">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${getVideoId(url || "")}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube video player"
                />
              </div>
            ) : (
              <div className="mb-8 aspect-video bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-500 shadow-inner">
                <VideoIcon className="w-16 h-16 mb-4 text-slate-400" />
                <p className="text-center text-lg font-semibold">
                  Enter a Youtube URL to get started
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="url"
                placeholder="Enter a Youtube URL"
                onChange={handleUrlChange}
                value={url || ""}
                className="flex-1 h-12 px-4 rounded-xl border-slate-200 focus:border-voilet-500 focus:ring-voilet-500"
                disabled={loading}
                aria-label="Youtube URL"
              />
              <Button
                disabled={loading || !isValide}
                className="h-12 px-6"
                onClick={handleGenerate}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Presentation"
                )}
              </Button>
            </div>
            <p className="text-center text-sm text-slate-500 mt-4">
              Supported formats: Youtube video URLs
            </p>
          </Card>
        </div>
      </MaxWidthWrapper>
    </div>
  );
};

export default GenerateForm;
