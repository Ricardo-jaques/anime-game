/* =========================
   PEGAR ELEMENTOS DO HTML
   ========================= */

let botao = document.getElementById("trans");

let base = document.getElementById("baseid");
let carregandojs = document.getElementById("carregandoid");
let ki = document.getElementById("kiid");
let ssj = document.getElementById("ssj");
let textossj = document.getElementById("textossj");
let Goku = document.getElementById("Goku");
document.body.classList.remove("tremor");

let midoriya = document.getElementById("midoriya");
let midoriyabase = document.getElementById("midoriyabase");
let midoriyacown = document.getElementById("midoriyacown");
let midoriyatext = document.getElementById("midoriyatext");
let raios = document.getElementById("raios");
let midoriya100 = document.getElementById("midoriya100");

let sukuna = document.getElementById("sukuna");
let sukunabase = document.getElementById("sukunabase");
let sukunatext = document.getElementById("sukunatext");
let megunatrans = document.getElementById("megunatrans");
let meguna = document.getElementById("meguna");
let heiantrans = document.getElementById("heiantrans");
let heian = document.getElementById("heian");


let btpersonagens = document.getElementById("exibir");
let listapersona = document.getElementById("lista");

let contagem2 = document.getElementById("contagem")


/* =========================
   VARIÁVEIS DE CONTROLE
   ========================= */

let contagem = 0;     // controla o estágio da transformação
let personagem = "";  // guarda qual personagem foi escolhido


/* =========================
   FUNÇÃO: ESCONDER PERSONAGENS
   Esconde todas as formas e efeitos
   ========================= */

function esconderPersonagens(){

    base.style.display = "none";
    carregandojs.style.display = "none";
    ki.style.display = "none";
    ssj.style.display = "none";
    textossj.style.display = "none";
    document.body.classList.remove("tremor");

    midoriyabase.style.display = "none";
    midoriyacown.style.display = "none";
    midoriya100.style.display ="none"
    raios.style.display = "none"
    midoriyatext.style.display= "none"

    sukunabase.style.display = "none"
    sukunatext.style.display = "none"
    megunatrans.style.display = "none"
    meguna.style.display = "none"
    heiantrans.style.display="none"
    heian.style.display="none"
    document.body.classList.remove("flash");
    sukunatext.style.top = "70%";
sukunatext.style.width = "33ch";


}


/* =========================
   FUNÇÃO: ESCOLHER PERSONAGEM
   Define qual personagem foi escolhido
   e reinicia a transformação
   ========================= */

function escolherpersonagem(nome){

    personagem = nome;   // guarda o nome do personagem
    contagem = 0;        // reinicia o contador

    esconderPersonagens();  // esconde tudo antes de começar

    if(personagem === "goku"){
        base.style.display="block"
    }

    if(personagem === "midoriya"){
        midoriyabase.style.display ="block"
    }

    if(personagem === "sukuna"){
        sukunabase.style.display = "block"
    }

    // fecha a lista de personagens
    listapersona.classList.remove("mostrar");
    listapersona.classList.add("oculto");
}


/* =========================
   BOTÃO DE TRANSFORMAÇÃO
   Cada clique aumenta o estágio
   ========================= */

botao.addEventListener("click", () => {

    contagem++; // avança estágio
    contagem2.innerText = contagem;
    
    // verifica qual personagem foi escolhido
    if(personagem === "goku"){
        transformarGoku();
    }

    if(personagem === "midoriya"){
        transformarMidoriya();
    }

    if(personagem === "sukuna"){
        transformarsukuna();
    }

})


/* =========================
   TRANSFORMAÇÃO DO GOKU
   Personagem: Goku
   Série: Dragon Ball
   ========================= */

function transformarGoku(){

    // estágio 1 — forma base
    if(contagem >= 1){
        base.style.display = "block";
    }

    // estágio 2 — carregando ki
    if(contagem >= 2){
        base.style.display = "none";
        carregandojs.style.display = "block";
    }

    // estágio 3 — aura e tremor
    if(contagem >= 3){
        ki.style.display = "block";
        document.body.classList.add("tremor");
    }

    // estágio 4 — frase aparece
    if(contagem >= 4){
        ki.style.display = "none";
        carregandojs.style.display = "none";
        document.body.classList.remove("tremor");
        textossj.style.display = "block";
    }

    // estágio 5 — vira super saiyajin
    if(contagem >= 5){
        ki.style.display = "none";
        carregandojs.style.display = "none";
        textossj.style.display = "none";
        document.body.classList.remove("tremor");
        ssj.style.display = "block";
    }

    // estágio 6 — reinicia transformação
    if(contagem >= 6){
        contagem = 0;
        ssj.style.display = "none";
    }

}


/* =========================
   TRANSFORMAÇÃO DO MIDORIYA
   Personagem: Izuku Midoriya
   Série: My Hero Academia
   ========================= */

function transformarMidoriya(){

    // estágio 1 — forma base
    if(contagem >= 1){
        midoriyabase.style.display = "block";
    }

    // estágio 2 — Full Cowl ativado
    if(contagem >= 2){
        midoriyabase.style.display = "none";
        midoriyatext.style.display = "block";
        midoriyatext.textContent = "ativado full cown";
        raios.style.display = "block";
    }

    if(contagem >= 3){
        raios.style.display = "none";
        midoriyacown.style.display = "block"
        midoriyatext.style.top = "110%"
        midoriyatext.textContent = "5% one for all"
    }

    if(contagem >= 4){
        midoriyatext.textContent = "10% one for all"
    }

    if ( contagem >= 5){
         midoriyatext.textContent = "20% one for all"
    }

    if (contagem >= 6){
         midoriyatext.textContent = "40% one for all"
    }

    if(contagem >= 7){
         midoriyatext.textContent = "80% one for all"
    }

    if(contagem >=8){
        midoriyacown.style.display="none"
        midoriya100.style.display="block"
         midoriyatext.textContent = "100% one for all"
         raios.style.display = "block"
         raios.style.height = "500px"
         raios.style.width = "500px"
    }

    if(contagem>= 9){
        contagem = 0
        midoriya100.style.display="none"
        raios.style.display = "none"
        
        midoriyatext.style.display = "none"
    }

}

function transformarsukuna(){


    if(contagem >=1){
        sukunabase.style.display = "block"
        sukunatext.style.display = "block"
        sukunatext.textContent = "sukuna 1 Dedo"
         sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");
    }

    if (contagem == 2){
        sukunatext.textContent = "Sukuna 2 Dedos"
        sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");
       
        
    }
    if (contagem == 3){
         sukunatext.textContent = "Sukuna 3 Dedos"
         sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");
         

    }

    if (contagem == 4){
         sukunatext.textContent = "Sukuna 4 Dedos"
        sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");
    }

    if (contagem == 5){
         sukunatext.textContent = "Sukuna 5 Dedos"
        sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");
    }

    if (contagem == 6){
        megunatrans.style.display = "block"
        sukunatext.innerHTML = "Após consumir quinze dos dedos de Sukuna,<br> Itadori se tornou ainda mais ligado ao rei das maldições.<br> Mas Sukuna tinha seus próprios planos…<br> Em busca de um novo recipiente, ele voltou seus olhos para Megumi —<br> e tomou posse de seu corpo";
        sukunabase.style.display = "none"
        sukunatext.style.top = "60%"
        sukunatext.style.width = "60ch"
        setTimeout(() => {
        document.body.classList.add("flash")
        }, 5000 )
        sukunatext.classList.remove("textosurgindo");
        
        
        sukunatext.classList.add("textosurgindo");
    }

    if (contagem == 7){
        document.body.classList.remove("flash")
        sukunabase.style.display="none"
        megunatrans.style.display ="none"
        sukunatext.textContent = "sukuna assumiu o corpo do megumi"
        meguna.style.display = "block"
        sukunatext.style.top="74%"
        sukunatext.style.width="50ch"
         sukunatext.classList.remove("textosurgindo");
         
    }
    if (contagem == 8){
        heiantrans.style.display="block"
       sukunatext.innerHTML = `
Após devorar mais cinco dedos…<br>
O corpo de Megumi começou a se contorcer.<br>
Uma aura maldita tomou conta do ambiente.<br>
Então algo impossível aconteceu…<br>
Dois novos braços surgiram de suas costas.<br>
Sukuna estava renascendo.<br>
O Rei das Maldições estava cada vez mais próximo de recuperar sua forma original.
`;
meguna.style.display="none"
 sukunatext.style.width="75ch"
 sukunatext.style.top= "65%"
  sukunatext.classList.remove("textosurgindo");
  sukunabase.style.display="none"
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");

    }

    if (contagem == 9){
        sukunatext.textContent="sukuna atingiu a sua forma maxima ele consumiu os 20 dedos"
        heian.style.display="block"
        meguna.style.display="none"
        heiantrans.style.display="none"
         sukunatext.style.width="70ch"
            sukunabase.style.display="none"
            sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");

    }
    if(contagem >= 10){
        contagem =0
        heian.style.display = "none"
        meguna.style.display= "none"
        sukunatext.textContent= " "
        sukunatext.style.width = "33ch";
         sukunatext.classList.remove("textosurgindo");
        
        void sukunatext.offsetWidth;
        sukunatext.classList.add("textosurgindo");
    }
  
}


/* =========================
   BOTÃO DE MOSTRAR PERSONAGENS
   Abre ou fecha a lista
   ========================= */

btpersonagens.addEventListener("click", () =>{

    if(listapersona.classList.contains("oculto")){

        listapersona.classList.remove("oculto");
        listapersona.classList.add("mostrar");

    }
    else{

        listapersona.classList.remove("mostrar");
        listapersona.classList.add("oculto");

    }

})

