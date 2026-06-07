import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

// ============================================================
// NAVBAR
// ============================================================
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold font-display text-primary">
          MindBridge
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#como-funciona"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ¿Cómo funciona?
          </Link>
          <Link
            href="#bienestar"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Equipo de Bienestar
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Ingresar
          </Link>
          <Link
            href="/registro"
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full
                       hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-sm"
          >
            Registrarme
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// HERO
// ============================================================
function Hero() {
  return (
    <section
      id="inicio"
      className="pt-32 pb-20 min-h-screen flex items-center bg-background"
    >
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          {/* <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-5">
            Universidad de Cartagena · Bienestar Universitario
          </p> */}

          <h1 className="text-5xl font-bold font-display leading-tight text-foreground mb-6">
            ¿Quieres hablar de ello?{" "}
            <span className="text-primary">
              No tienes que decirnos quién eres.
            </span>
          </h1>

          <p className="text-lg text-muted leading-relaxed mb-8 max-w-md">
            Publica cómo te sientes. Si necesitas ayuda, el equipo de bienestar
            de tu institución puede contactarte.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white
                         font-semibold rounded-full hover:bg-primary/90 transition-all
                         hover:-translate-y-0.5 shadow-lg shadow-primary/20"
            >
              Registrarme
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              ¿Ya tienes cuenta? Ingresar →
            </Link>
          </div>

          <p className="mt-5 text-sm text-muted/70">
            Tu identidad nunca es visible en el foro.
          </p>
        </div>

        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 bg-border/30">
            <Image
              src="/student-in-laptop.jpg"
              alt="Estudiante usando MindBridge en su computador"
              width={600}
              height={500}
              className="w-full h-auto"
              priority
            />
          </div>

          <div className="absolute -bottom-4 -left-4 bg-surface rounded-2xl p-4 shadow-lg border border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                100% Anónimo
              </p>
              <p className="text-xs text-muted">Tu nombre nunca se muestra</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================
const steps = [
  {
    number: "Paso 1",
    title: "Regístrate con tu código",
    description:
      "Solo necesitas tu código estudiantil, una contraseña y tu sede. " +
      "Tú eliges el nombre con el que apareces en el foro.",
    image: "/student-in-laptop.jpg",
    alt: "Estudiante registrándose en MindBridge",
  },
  {
    number: "Paso 2",
    title: "Publica cuando quieras",
    description:
      "Escribe lo que sientes, cuando quieras. Otros pueden comentarte " +
      "y tú puedes comentar a otros. Sin límites de frecuencia.",
    image: "/post-card.jpg",
    alt: "Publicación anónima en el foro",
  },
  {
    number: "Paso 3",
    title: "Apoyo cuando lo necesitas",
    description:
      "Si el sistema detecta que podrías necesitar ayuda, un psicólogo " +
      "puede escribirte directamente. Sin que nadie más lo sepa.",
    image: "/therapy-sesion.jpg",
    alt: "Psicólogo contactando a un estudiante",
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-28 bg-surface">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold font-display text-foreground mb-4">
            ¿Cómo funciona MindBridge?
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Tres pasos diseñados para acompañarte sin presiones ni burocracia.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-background rounded-3xl border border-border overflow-hidden
                         transition-all duration-300 hover:-translate-y-1.5
                         hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="h-52 overflow-hidden bg-border/30">
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={400}
                  height={208}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <span className="inline-block px-3 py-1 bg-accent/15 text-accent text-xs font-semibold rounded-full mb-3">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PSYCHOLOGIST STRIP
// Fondo: primary (verde medio). Se distingue del footer oscuro.
// ============================================================
function PsychologistStrip() {
  return (
    <section id="bienestar" className="py-14 bg-primary">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">
            Equipo de Bienestar
          </p>
          <h3 className="text-2xl font-bold font-display text-white">
            ¿Eres parte del equipo de bienestar?
          </h3>
          <p className="text-white/70 mt-1 text-sm">
            Accede al panel de alertas y gestiona los casos desde tu perfil.
          </p>
        </div>

        <Link
          href="/login?role=psychologist"
          className="shrink-0 px-6 py-3 bg-white/15 hover:bg-white/25 text-white
                     text-sm font-medium rounded-full border border-white/30 transition-all
                     hover:-translate-y-0.5"
        >
          Acceder como psicólogo →
        </Link>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// Fondo: foreground (#1A3B34, verde muy oscuro).
// Visualmente distinto del strip (verde medio) arriba.
// ============================================================
const developers = ["Juan Diego Bello", "Samuel Movilla", "Steven Pacheco"];

function Footer() {
  return (
    <footer className="bg-foreground border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-6">
        <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-white/10">
          {/* Columna 1 — Proyecto */}
          <div>
            <h3 className="text-white font-bold text-xl font-display mb-2">
              MindBridge
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Construyendo puentes de empatía y salud mental universitaria.
            </p>
          </div>

          {/* Columna 2 — Desarrolladores */}
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">
              Desarrollado por
            </p>
            <ul className="space-y-1">
              {developers.map((name) => (
                <li key={name} className="text-sm text-white/60">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Institución */}
          <div className="md:text-right">
            <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-3">
              Institución
            </p>
            <p className="text-sm text-white/70 font-medium">
              Universidad de Cartagena
            </p>
            <p className="text-sm text-white/50">
              Programa de Ingeniería en Sistemas
            </p>
            <p className="text-sm text-white/50 mt-1">
              Cartagena, Piedra Bolívar
            </p>
            <p className="mt-3">
              <Link
                href="#"
                className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
              >
                Términos y condiciones
              </Link>
            </p>
          </div>
        </div>

        <p className="pt-6 text-center text-xs text-white/30">
          © 2026 MindBridge · WCAG 2.2 · Ley 1581 de 2012 · Protección de datos
          confidenciales.
        </p>
      </div>
    </footer>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <PsychologistStrip />
      <Footer />
    </main>
  );
}
