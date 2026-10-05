/*
==========================================================================
  thiago.dev | scripts.js

  Indice
    1. Configuracao
    2. Tema (claro/escuro)
    3. Cor da aba do navegador
    4. Entrada suave ao rolar
    5. Barra de progresso
    6. Menu com secao ativa
    7. Ano do rodape
    8. Inicio
==========================================================================
*/

(function () {
    'use strict';


    /* ======================================================================
       1. CONFIGURACAO
       ====================================================================== */
    const raiz = document.documentElement;                                     // <html>
    const chaveTema = 'tema';                                                  // nome no localStorage
    const botaoTema = document.querySelector('.tema');

    // matchMedia protegido: se o navegador nao tiver, devolve um valor padrao
    // (escuro = o mesmo padrao do CSS de reserva; movimento = nao reduzido)
    function consultar(texto, padrao) {
        if (!window.matchMedia) return { matches: padrao };
        return window.matchMedia(texto);
    }

    const sistemaEscuro = consultar('(prefers-color-scheme: dark)', true);          // tema do sistema
    const reduzMovimento = consultar('(prefers-reduced-motion: reduce)', false).matches;


    /* ======================================================================
       2. TEMA
       Regra: se o visitante nunca clicou no botao, o site segue o sistema
       (inclusive se o sistema mudar com a pagina aberta). Se clicou, a
       escolha dele fica salva. Clicar de volta no tema do sistema apaga
       a escolha e o site volta a seguir o sistema.
       ====================================================================== */

    // Le a escolha salva ('light', 'dark' ou null). Try/catch: o storage pode estar bloqueado.
    function lerEscolha() {
        try {
            const valor = localStorage.getItem(chaveTema);
            return valor === 'light' || valor === 'dark' ? valor : null;
        } catch (erro) {
            return null;
        }
    }

    function salvarEscolha(valor) {
        try {
            if (valor) {
                localStorage.setItem(chaveTema, valor);
            } else {
                localStorage.removeItem(chaveTema);
            }
        } catch (erro) {
            /* sem storage: o tema vale so ate fechar a pagina */
        }
    }

    function temaDoSistema() {
        return sistemaEscuro.matches ? 'dark' : 'light';
    }

    // Tema que deve estar ativo agora
    function temaAtual() {
        return lerEscolha() || temaDoSistema();
    }

    // Troca o icone e o texto do botao conforme o tema
    function atualizarBotao(tema) {
        if (!botaoTema) return;
        const rotulo = tema === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro';
        botaoTema.setAttribute('aria-label', rotulo);
        botaoTema.setAttribute('title', rotulo);
    }

    // Aplica o tema. "animar" liga o fade de cores (nao liga na abertura da pagina).
    function aplicarTema(tema, animar) {
        const comFade = animar && !reduzMovimento;

        if (comFade) {
            raiz.classList.add('trocando-tema');
            setTimeout(function () {
                raiz.classList.remove('trocando-tema');
            }, 400);
        }

        raiz.setAttribute('data-tema', tema);
        atualizarBotao(tema);

        // Durante o fade o navegador ainda devolve a cor antiga; por isso espera terminar
        if (comFade) {
            setTimeout(atualizarCorDaAba, 420);
        } else {
            atualizarCorDaAba();
        }
    }

    function iniciarTema() {
        aplicarTema(temaAtual(), false);

        // Clique no botao: vai para o tema oposto
        if (botaoTema) {
            botaoTema.addEventListener('click', function () {
                const proximo = raiz.getAttribute('data-tema') === 'dark' ? 'light' : 'dark';
                // Se o novo tema e o do sistema, nao precisa guardar nada
                salvarEscolha(proximo === temaDoSistema() ? null : proximo);
                aplicarTema(proximo, true);
            });
        }

        // Sistema mudou (ex.: modo escuro automatico do macOS ao anoitecer)
        sistemaEscuro.addEventListener('change', function () {
            if (!lerEscolha()) {
                aplicarTema(temaDoSistema(), true);
            }
        });
    }


    /* ======================================================================
       3. COR DA ABA DO NAVEGADOR
       Le a cor de fundo real do site (a que o CSS esta usando agora) e
       grava na meta theme-color. Assim a aba/barra acompanha o tema.
       ====================================================================== */

    // 'rgb(14, 16, 19)' -> '#0e1013'
    function rgbParaHex(rgb) {
        const numeros = rgb.match(/\d+(\.\d+)?/g);
        if (!numeros || numeros.length < 3) return rgb;
        return '#' + numeros.slice(0, 3).map(function (n) {
            return Math.round(Number(n)).toString(16).padStart(2, '0');
        }).join('');
    }

    function atualizarCorDaAba() {
        const cor = rgbParaHex(getComputedStyle(document.body).backgroundColor);
        const metas = document.querySelectorAll('meta[name="theme-color"]');

        // Fica uma meta so, sem "media", para valer o tema ativo e nao o do sistema
        let meta = metas[0];
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        for (let i = 1; i < metas.length; i++) {
            metas[i].remove();
        }
        meta.removeAttribute('media');
        meta.setAttribute('content', cor);
    }


    /* ======================================================================
       4. ENTRADA SUAVE AO ROLAR
       Os elementos de cada secao aparecem subindo e surgindo (fade),
       um depois do outro. O CSS esta na secao 13 do style.css.
       ====================================================================== */
    function iniciarEntradaSuave() {
        if (reduzMovimento || !('IntersectionObserver' in window)) return;

        const observador = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add('visivel');
                    observador.unobserve(entrada.target);    // anima so uma vez
                }
            });
        }, { rootMargin: '0px 0px -10% 0px' });

        document.querySelectorAll('main > section > *').forEach(function (elemento) {
            const posicao = Array.prototype.indexOf.call(elemento.parentElement.children, elemento);
            elemento.style.setProperty('--i', posicao);    // atraso escalonado
            elemento.classList.add('revelar');
            observador.observe(elemento);
        });
    }


    /* ======================================================================
       5. BARRA DE PROGRESSO
       Linha de 2px no topo que cresce conforme a rolagem.
       ====================================================================== */
    function iniciarProgresso() {
        const barra = document.createElement('span');
        barra.className = 'progresso';
        barra.setAttribute('aria-hidden', 'true');
        document.body.prepend(barra);

        let agendado = false;

        function atualizar() {
            const total = raiz.scrollHeight - window.innerHeight;
            const fracao = total > 0 ? window.scrollY / total : 0;
            barra.style.transform = 'scaleX(' + Math.min(Math.max(fracao, 0), 1) + ')';
            agendado = false;
        }

        // requestAnimationFrame: atualiza no maximo uma vez por quadro
        function aoRolar() {
            if (!agendado) {
                agendado = true;
                window.requestAnimationFrame(atualizar);
            }
        }

        window.addEventListener('scroll', aoRolar, { passive: true });
        window.addEventListener('resize', aoRolar);
        atualizar();
    }


    /* ======================================================================
       6. MENU COM SECAO ATIVA
       O link da secao que esta no meio da tela ganha aria-current="true"
       (o CSS destaca esse link).
       ====================================================================== */
    function iniciarMenuAtivo() {
        if (!('IntersectionObserver' in window)) return;

        const links = Array.prototype.slice.call(document.querySelectorAll('nav a[href^="#"]'));
        const secaoDoLink = new Map();

        links.forEach(function (link) {
            const secao = document.querySelector(link.getAttribute('href'));
            if (secao) secaoDoLink.set(secao, link);
        });

        // Faixa fina no meio da tela: a secao que cruza essa faixa e a ativa
        const observador = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (!entrada.isIntersecting) return;
                links.forEach(function (link) {
                    link.removeAttribute('aria-current');
                });
                secaoDoLink.get(entrada.target).setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        secaoDoLink.forEach(function (link, secao) {
            observador.observe(secao);
        });
    }


    /* ======================================================================
       7. ANO DO RODAPE
       ====================================================================== */
    function atualizarAno() {
        const ano = document.getElementById('ano');
        if (ano) ano.textContent = new Date().getFullYear();
    }


    /* ======================================================================
       8. INICIO
       O script esta com "defer", entao o HTML ja esta pronto aqui.
       ====================================================================== */
    iniciarTema();
    iniciarEntradaSuave();
    iniciarProgresso();
    iniciarMenuAtivo();
    atualizarAno();

})();