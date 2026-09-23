import type { Metadata } from "next";

// Nicht verlinkt und nicht in Suchmaschinen — wer die Adresse kennt, darf hochladen.
export const metadata: Metadata = {
  title: "Arbeitsblätter",
  robots: { index: false, follow: false },
};

export default function BlaetterLayout({ children }: LayoutProps<"/blaetter">) {
  return children;
}
