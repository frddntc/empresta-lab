import { Link } from 'react-router-dom'
import {
  ClipboardList,
  FlaskConical,
  Headset,
  Info,
  LogIn,
  Mail,
  PackageSearch,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import labHero from '../assets/lab-hero.jpg'

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <img src={labHero} alt="" aria-hidden="true" className="home-hero-bg" />
        <h2>
          Empresta Lab
          <FlaskConical size={40} aria-hidden="true" className="home-hero-icon" />
        </h2>
        <p className="home-tagline">
          O caminho mais rápido entre você e o equipamento certo para o seu experimento.
        </p>
      </section>

      <section className="home-boxes" aria-label="Sobre o Empresta Lab">
        <article className="home-box">
          <h3>
            <Info size={18} aria-hidden="true" />
            Sobre nós
          </h3>
          <p>
            Somos o sistema de empréstimos do laboratório: consulte pelo assistente virtual,
            reserve em segundos e retire direto na bancada — sem papelada.
          </p>
        </article>

        <article className="home-box">
          <h3>
            <ClipboardList size={18} aria-hidden="true" />
            Devolução simples
          </h3>
          <p>
            Cada empréstimo tem prazo claro e combinado com você. Devolvendo na data, o
            equipamento volta ao catálogo e sua ficha fica limpa para o próximo uso.
          </p>
        </article>

        <article className="home-box">
          <h3>
            <PackageSearch size={18} aria-hidden="true" />
            O que você encontra
          </h3>
          <p>
            Paquímetros, multímetros digitais, osciloscópios, termômetros e EPIs — um catálogo
            vivo, sempre atualizado pela equipe do lab.
          </p>
        </article>
      </section>

      <section className="home-ctas" aria-label="Acessos">
        <Link to="/login" className="home-cta">
          <strong>
            <LogIn size={18} aria-hidden="true" />
            Fazer login
          </strong>
          <span>Fale já com o nosso assistente virtual.</span>
        </Link>

        <Link to="/register" className="home-cta">
          <strong>
            <UserPlus size={18} aria-hidden="true" />
            Criar conta
          </strong>
          <span>Ainda não tem uma conta? Cadastre-se já e faça seu primeiro empréstimo.</span>
        </Link>

        <Link to="/admin/login" className="home-cta">
          <strong>
            <ShieldCheck size={18} aria-hidden="true" />
            Painel administrativo
          </strong>
          <span>É um administrador? Atualize seu estoque e fique por dentro de seus empréstimos vigentes.</span>
        </Link>
      </section>

      <footer className="support-bar" aria-label="Suporte">
        <h3>
          <Headset size={18} aria-hidden="true" />
          Precisa de ajuda? Fale com o suporte
        </h3>
        {/* Dados de suporte a preencher quando definidos (email e telefone). */}
        <span className="support-item">
          <Mail size={16} aria-hidden="true" />
          Email: —
        </span>
        <span className="support-item">
          <Phone size={16} aria-hidden="true" />
          Telefone: —
        </span>
      </footer>
    </div>
  )
}
