// PodCore Presentation Website - JavaScript

document.addEventListener('DOMContentLoaded', () => {

  // ===========================
  // Navigation scroll effect
  // ===========================
  const nav = document.getElementById('nav');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
      backToTop.classList.add('visible');
    } else {
      nav.classList.remove('scrolled');
      backToTop.classList.remove('visible');
    }
  });

  // ===========================
  // Mobile menu toggle
  // ===========================
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');

  navToggle.addEventListener('click', () => {
    navMobile.classList.toggle('open');
  });

  // Close mobile menu on link click
  navMobile.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMobile.classList.remove('open');
    });
  });

  // ===========================
  // Screenshot tabs
  // ===========================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const mockScreens = document.querySelectorAll('.mock-screen');
  const browserUrl = document.getElementById('browserUrl');

  const tabUrls = {
    dashboard: 'localhost:3001/',
    episodes: 'localhost:3001/episodes',
    editorial: 'localhost:3001/editorial',
    sponsors: 'localhost:3001/sponsors',
    admin: 'localhost:3001/admin',
    settings: 'localhost:3001/settings'
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // Update active button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active screen with fade
      mockScreens.forEach(screen => {
        screen.classList.remove('active');
        screen.style.opacity = '0';
      });

      const targetScreen = document.getElementById('tab-' + tab);
      if (targetScreen) {
        targetScreen.classList.add('active');
        setTimeout(() => {
          targetScreen.style.opacity = '1';
          targetScreen.style.transition = 'opacity 0.3s ease';
        }, 10);
      }

      // Update URL bar
      if (browserUrl && tabUrls[tab]) {
        browserUrl.textContent = tabUrls[tab];
      }
    });
  });

  // ===========================
  // Smooth scroll for anchor links
  // ===========================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navHeight = nav.offsetHeight;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    });
  });

  // ===========================
  // Intersection Observer for animations
  // ===========================
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Animate feature cards
  document.querySelectorAll('.feature-card, .step-card, .tech-card, .stat-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    observer.observe(el);
  });

  // ===========================
  // Counter animation for stats
  // ===========================
  const statNumbers = document.querySelectorAll('.stat-number');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.textContent.replace('+', ''));
        const suffix = el.textContent.includes('+') ? '+' : '';
        const duration = 1500;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = Math.floor(current) + suffix;
        }, 16);

        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => counterObserver.observe(el));

  // ===========================
  // Active nav link highlighting
  // ===========================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.style.color = '';
          if (link.getAttribute('href') === '#' + id) {
            link.style.color = 'var(--text-primary)';
          }
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(section => sectionObserver.observe(section));

});
