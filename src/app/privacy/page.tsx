import type { Metadata } from 'next'
import Link from 'next/link'
import reveal from '@/components/ui/reveal.module.css'
import styles from './privacy.module.css'

export const metadata: Metadata = {
  title: 'Privacidad · Lucka',
  description: 'Tus datos nunca salen de tu computador.',
}

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={`${reveal.reveal} ${styles.header}`}>
        <p className={styles.eyebrow}>Privacidad</p>
        <h1 className={styles.title}>
          Tus datos nunca salen de tu computador.
        </h1>
        <p className={styles.lead}>
          Sin cuenta, sin servidor, sin nube. Lucka guarda todo en un archivo
          dentro de tu equipo.
        </p>
      </header>

      <section className={styles.columns}>
        <div>
          <h2>Qué se guarda</h2>
          <ul>
            <li>Tu nombre, ingreso mensual y día de pago</li>
            <li>Gastos fijos y categorías con su presupuesto</li>
            <li>Gastos e ingresos extra</li>
            <li>Aporte y saldo de inversiones</li>
          </ul>
        </div>
        <div>
          <h2>Qué no pasa</h2>
          <ul>
            <li>No se envía nada a internet</li>
            <li>No hay registro ni contraseña</li>
            <li>No hay analítica ni rastreo</li>
          </ul>
        </div>
      </section>

      <section className={styles.warning}>
        <h2>Tú cuidas el archivo</h2>
        <p>
          Si borras la app o cambias de equipo, tus datos se quedan donde
          estaban. Desde Ajustes puedes exportarlos e importarlos.
        </p>
      </section>

      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
