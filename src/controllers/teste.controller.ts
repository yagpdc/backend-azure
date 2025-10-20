import type { Request, Response } from "express";

export class TesteController {
  teste = (_req: Request, res: Response) => {
    res.json({ message: "Resposta da API" });
  };

  add = (req: Request, res: Response) => {
    try {
      const { value1, value2 } = req.params;
      const num1 = Number(value1);
      const num2 = Number(value2);

      if (isNaN(num1) || isNaN(num2)) {
        return res
          .status(400)
          .json({ error: "Os valores devem ser números válidos" });
      }

      const result = {
        value1,
        value2,
        sum: num1 + num2,
        message: "Soma realizada com sucesso!",
      };
      res.json(result);
    } catch (error: any) {
      res
        .status(400)
        .json({ error: error?.message ?? "Erro ao processar soma" });
    }
  };

  multiply = (req: Request, res: Response) => {
    try {
      const { value1, value2 } = req.params;
      const num1 = Number(value1);
      const num2 = Number(value2);

      if (isNaN(num1) || isNaN(num2)) {
        return res
          .status(400)
          .json({ error: "Os valores devem ser números válidos" });
      }

      const result = {
        value1,
        value2,
        result: num1 * num2,
        message: "Multiplicação realizada com sucesso!",
      };
      res.json(result);
    } catch (error: any) {
      res
        .status(400)
        .json({ error: error?.message ?? "Erro ao processar multiplicação" });
    }
  };
}
