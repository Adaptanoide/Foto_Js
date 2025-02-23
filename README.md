Sistema de Captura de Foto com QR Code
Descrição
Este sistema permite capturar fotos usando a câmera do dispositivo e associá-las a um código QR lido previamente. O código QR contém 5 dígitos que são extraídos automaticamente, exibidos na interface e usados para renomear a imagem capturada. Após tirar a foto, o sistema baixa automaticamente o arquivo, e o fluxo é reiniciado para permitir a leitura de outro código QR.

Funcionalidades
Leitura de QR Code: Escaneia e extrai 5 dígitos de um QR Code.
Captura de Foto: Ao escanear o QR, o sistema já prepara a captura de uma foto, renomeia automaticamente e baixa o arquivo.
Layout Responsivo: O sistema foi desenvolvido para funcionar bem em dispositivos móveis e desktops.
Interface Simples e Intuitiva: Exibição clara do número extraído do QR Code e da câmera para captura da foto.
Automação: O download da imagem é feito automaticamente após a captura, sem a necessidade de intervenção do usuário.

Estrutura do Projeto
📂 onedrive-app
│── 📂 backend          # Backend (não incluso neste projeto)
│── 📂 frontend         # Frontend do sistema
│   │── 📄 index.html   # HTML para a estrutura da página
│   │── 📄 style.css    # Estilos principais
│   │── 📄 script.js    # Lógica JavaScript para interatividade
│   │── 📄 README.md    # Documentação do frontend
│── 📄 README.md        # Documentação geral do projeto

Como Usar
Abra o arquivo index.html em seu navegador.
O sistema iniciará a captura do QR Code automaticamente.
Ao escanear um QR Code, o número de 5 dígitos será extraído e exibido em uma faixa branca.
A câmera do dispositivo será ativada, e o botão para tirar a foto será mostrado logo abaixo da área do QR Code.
Após a foto ser tirada, ela será automaticamente renomeada com o número do QR Code e será baixada para o seu dispositivo.
O sistema retornará ao estado de leitura de QR Code, pronto para ler outro código.

Dependências
Nenhuma dependência externa é necessária para rodar este sistema. O código é feito em HTML, CSS e JavaScript puro.
Customização
Se você quiser ajustar o comportamento ou o layout do sistema, basta editar os arquivos:

style.css: Para alterar o estilo da interface.
script.js: Para modificar a lógica de leitura do QR Code e captura de fotos.
Licença
Este projeto está licenciado sob a MIT License.

