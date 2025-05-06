import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Waveform Test - Topline",
  description: "Test the AudioWaveform component",
};

export default function WaveformTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className={`${inter.className} min-h-screen`}>
      {children}
    </section>
  );
} 