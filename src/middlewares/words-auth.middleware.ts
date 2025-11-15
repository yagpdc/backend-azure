import type { Request, Response, NextFunction } from "express";
import { WordsCredentialService } from "../services/words-credentials.service";
import { WordsUsersService } from "../services/words-users.service";

const credentialService = new WordsCredentialService();
const usersService = new WordsUsersService();

function unauthorized(res: Response) {
  return res.status(401).json({ error: "Invalid Words credentials" });
}

export async function wordsAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!credentialService.hasCredentials()) {
    return res
      .status(500)
      .json({ error: "Words credentials are not configured" });
  }

  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Basic ")) {
    return unauthorized(res);
  }

  let account: string | undefined;
  let password: string | undefined;
  try {
    const decoded = Buffer.from(
      authorization.replace("Basic ", ""),
      "base64",
    ).toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      return unauthorized(res);
    }
    account = decoded.slice(0, separatorIndex);
    password = decoded.slice(separatorIndex + 1);
  } catch (error) {
    return unauthorized(res);
  }

  const credential = credentialService.resolve(account, password);
  if (!credential) {
    return unauthorized(res);
  }

  const user = credential.userId
    ? await usersService.findById(credential.userId)
    : await usersService.findByName(credential.account);
  if (!user) {
    return res
      .status(404)
      .json({ error: `Words user not found for ${credential.account}` });
  }

  req.wordsUser = user;
  return next();
}
