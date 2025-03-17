"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ProcessedFile {
  id: string;
  fileName: string;
  status: "completed" | "processing" | "failed";
  createdAt: string;
  acapellaUrl?: string;
  instrumentalUrl?: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch the user's processed files from the API
    // For now, we'll just simulate it with some dummy data
    const dummyFiles: ProcessedFile[] = [
      {
        id: "1",
        fileName: "song1.mp3",
        status: "completed",
        createdAt: new Date().toISOString(),
        acapellaUrl: "#",
        instrumentalUrl: "#",
      },
      {
        id: "2",
        fileName: "song2.mp3",
        status: "processing",
        createdAt: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setFiles(dummyFiles);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <AuroraBackground>
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Your Dashboard
            </h1>
            <p className="text-muted-foreground">
              View and manage your processed audio files
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium">Processed Files</h2>
              <Button onClick={() => window.location.href = "/upload"}>
                Upload New File
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4">Loading your files...</p>
              </div>
            ) : files.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4">File Name</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id} className="border-b border-white/10">
                        <td className="py-3 px-4">{file.fileName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              file.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : file.status === "processing"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {file.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {file.status === "completed" && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.acapellaUrl)}
                              >
                                Acapella
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.instrumentalUrl)}
                              >
                                Instrumental
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  You haven't processed any files yet.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => window.location.href = "/upload"}
                >
                  Upload Your First File
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AuroraBackground>
  );
} 