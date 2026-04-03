import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import InputField from "@/components/ui/InputField";

export default function Home() {
  return (
    <div className="min-h-screen bg-void p-8">
      <h1 className="font-display text-4xl font-bold text-ink mb-8">
        RESCUE<span className="text-orange">GRID</span>
      </h1>

      <section className="mb-8">
        <h2 className="font-mono text-xs text-dim uppercase tracking-[0.2em] mb-4">
          Button Variants
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">PRIMARY CTA</Button>
          <Button variant="secondary">SECONDARY</Button>
          <Button variant="ghost">GHOST</Button>
          <Button variant="danger">DANGER</Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-mono text-xs text-dim uppercase tracking-[0.2em] mb-4">
          Button Sizes
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button size="default">DEFAULT</Button>
          <Button size="small">SMALL</Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-mono text-xs text-dim uppercase tracking-[0.2em] mb-4">
          Status Badges
        </h2>
        <div className="flex flex-wrap gap-4">
          <StatusBadge status="critical" label="CRITICAL" />
          <StatusBadge status="on-mission" label="ON MISSION" />
          <StatusBadge status="ready" label="READY" />
          <StatusBadge status="standby" label="STANDBY" />
          <StatusBadge status="completed" label="COMPLETED" />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-mono text-xs text-dim uppercase tracking-[0.2em] mb-4">
          Input Fields
        </h2>
        <div className="max-w-md space-y-4">
          <InputField label="PHONE NUMBER" type="tel" placeholder="+91 XXXXXXXXXX" />
          <InputField label="LOCATION" type="text" placeholder="Chalakudy, Thrissur" />
        </div>
      </section>

      <p className="font-mono text-[10px] text-dim">
        Clip-path tactical: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))
      </p>
    </div>
  );
}
