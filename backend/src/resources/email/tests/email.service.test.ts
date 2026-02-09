import { sendEmail } from "../email.service";
import { google } from "googleapis";

// Mock completo da biblioteca 'googleapis' para isolar nosso serviço.
jest.mock("googleapis", () => {
  // Criamos uma função mock que podemos espionar nos testes.
  const mockSend = jest.fn();
  
  return {
    google: {
      // Mock da autenticação para evitar que o código real seja executado.
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: jest.fn(),
        })),
      },
      // Mock do serviço do Gmail.
      gmail: jest.fn(() => ({
        users: {
          messages: {
            send: mockSend,
          },
        },
      })),
    },
  };
});

// Tipando o nosso mock da função 'send' para ter autocomplete.
const mockedGmailSend = (google.gmail("v1") as any).users.messages.send as jest.Mock;

describe("EmailService", () => {
  // Silencia os logs do console para uma saída de teste limpa.
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(() => {
    // Limpa o histórico de chamadas do mock antes de cada teste.
    jest.clearAllMocks();
  });

  it("deve construir a mensagem, codificá-la e enviá-la com sucesso", async () => {
    // Arrange: Preparamos o cenário de sucesso.
    const options = {
      to: "destinatario@teste.com",
      subject: "Assunto do Teste",
      html: "<p>Corpo do e-mail</p>",
    };
    
    // Simulamos que a API do Google respondeu com sucesso.
    mockedGmailSend.mockResolvedValue({ status: 200 });

    // Act: Executamos a função que queremos testar.
    const result = await sendEmail(options);

    // Assert: Verificamos se tudo ocorreu como esperado.
    expect(result).toBe(true);
    expect(mockedGmailSend).toHaveBeenCalledTimes(1);
    
    // Verificação rigorosa: garantimos que a mensagem foi formatada e codificada corretamente.
    const expectedMessageParts = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      options.html,
    ];
    const expectedRawMessage = Buffer.from(expectedMessageParts.join("\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
      
    expect(mockedGmailSend).toHaveBeenCalledWith({
      userId: "me",
      requestBody: {
        raw: expectedRawMessage,
      },
    });
  });

  it("deve retornar false se a API do Gmail falhar ao enviar o e-mail", async () => {
    // Arrange: Preparamos o cenário de falha.
    const options = {
      to: "destinatario@teste.com",
      subject: "Assunto do Teste",
      html: "<p>Corpo do e-mail</p>",
    };
    
    // Simulamos que a API do Google retornou um erro.
    const apiError = new Error("API Limit Exceeded");
    mockedGmailSend.mockRejectedValue(apiError);

    // Act: Executamos a função.
    const result = await sendEmail(options);

    // Assert: Verificamos se a falha foi tratada corretamente.
    expect(result).toBe(false);
    expect(mockedGmailSend).toHaveBeenCalledTimes(1);
  });
});