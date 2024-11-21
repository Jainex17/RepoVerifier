import ProjectInput from "@/components/ProjectInput";

export default function Home() {
  return (
    <>
      <div className="flex items-center flex-col h-[95vh] justify-center">
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>
        <ProjectInput />
      </div>
    </>
  );
}
