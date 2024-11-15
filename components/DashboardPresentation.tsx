import React from "react";
import { GeneratedPowerPoints } from "@prisma/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ExternalLink, Presentation } from "lucide-react";
import { Button } from "./ui/button";

interface DashboardPresentationProps {
  presentations: GeneratedPowerPoints[];
}
const DashboardPresentation = ({
  presentations,
}: DashboardPresentationProps) => {
  if (!presentations || presentations.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow border-1 border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Presentation className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">
            No presentations yet
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Generate your first presentation to get started
          </p>
          <Link href="/generate">
            <Button className="mt-4">Create Presentation</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {presentations.map((presentation) => (
        <Card
          key={presentation.id}
          className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow border-1 border-slate-200"
        >
          <CardHeader>
            <CardTitle className="line-clamp-1">
              {presentation.title || "Untitled Presentation"}
            </CardTitle>
            <CardDescription>
              Created{" "}
              {formatDistanceToNow(new Date(presentation.createdAt), {
                addSuffix: true,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
              {presentation.description || "No description available"}
            </p>
            <div className="flex justify-between items-center">
              <Link
                href={presentation.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Presentation
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardPresentation;
