import { Link } from "wouter";
import { motion } from "framer-motion";
import { Shield, Lock, Fingerprint, ScanFace, FileDigit, Server, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register">
              <Button>Create account</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          
          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="max-w-2xl"
              >
                <motion.div variants={itemVariants} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary/10 text-secondary mb-6">
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  Financial-grade identity vault
                </motion.div>
                
                <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
                  Protect your identity with <span className="text-primary">true multi-factor</span> security.
                </motion.h1>
                
                <motion.p variants={itemVariants} className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
                  AuthFusion safeguards your sensitive personal data using a proprietary 3-stage protection model: Email OTP, encrypted MPIN, and on-device biometrics (Face & Fingerprint).
                </motion.p>
                
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                      Get started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
                      Sign in
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Animated Visualization */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:flex items-center justify-center h-[500px]"
              >
                <div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="relative z-10 w-80 h-80 flex items-center justify-center">
                  <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-4 border border-secondary/30 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  <div className="absolute inset-12 border border-primary/10 rounded-full animate-[spin_20s_linear_infinite]" />
                  
                  <div className="bg-card border shadow-xl rounded-2xl p-6 flex flex-col items-center gap-4 z-20 w-48">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <ScanFace className="w-4 h-4" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <FileDigit className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary w-full" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Encrypted at rest</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-20 bg-muted/50 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">The 3-stage protection model</h2>
              <p className="text-muted-foreground text-lg">We use three independent factors to ensure nobody but you can access your data.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { title: "Something you have", desc: "Your verified email address receives secure OTPs.", icon: Lock },
                { title: "Something you know", desc: "A 6-digit MPIN known only to you.", icon: FileDigit },
                { title: "Something you are", desc: "Your device's biometric sensors and facial recognition.", icon: ScanFace },
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border rounded-xl p-6 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Pillars */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">Engineered for absolute trust</h2>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: "AES-256 Encryption", desc: "Aadhaar and personal data are encrypted at rest." },
                { title: "Bcrypt Hashing", desc: "MPINs are heavily salted and hashed." },
                { title: "WebAuthn Backed", desc: "Hardware-level biometric security keys." },
                { title: "Zero Data Exfiltration", desc: "Face matching runs entirely in your browser." },
              ].map((pillar, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border rounded-xl bg-card/50 hover:bg-card transition-colors">
                  <div className="mt-1">
                    <CheckCircle2 className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{pillar.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{pillar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Band */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <Server className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-2xl md:text-3xl font-medium leading-relaxed mb-12">
              "We never store your actual biometric images. The system only retains mathematical descriptors that cannot be reverse-engineered."
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-primary-foreground/20 border-t border-primary-foreground/20 pt-12">
              <div className="px-4">
                <div className="text-3xl font-bold mb-2">256-bit</div>
                <div className="text-sm text-primary-foreground/70">Encryption</div>
              </div>
              <div className="px-4">
                <div className="text-3xl font-bold mb-2">Zero</div>
                <div className="text-sm text-primary-foreground/70">Password reuse</div>
              </div>
              <div className="px-4">
                <div className="text-3xl font-bold mb-2">100%</div>
                <div className="text-sm text-primary-foreground/70">On-device matching</div>
              </div>
              <div className="px-4">
                <div className="text-3xl font-bold mb-2">24/7</div>
                <div className="text-sm text-primary-foreground/70">Availability</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <Logo />
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} AuthFusion Security. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
