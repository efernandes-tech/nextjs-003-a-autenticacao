import { authService } from "./authService";
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

export function withSession(funcao) {
  return async (ctx) => {
    try {
      const session = await authService.getSession(ctx);
      const modifiedCtx = {
        ...ctx,
        req: {
          ...ctx.req,
          session: session
        }
      }
      return funcao(modifiedCtx);
    } catch (err) {
      return {
        redirect: {
          permanent: false,
          destination: '/?error=unauthorized'
        }
      }
    }
  }
}

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authService.getSession()
      .then((userSession) => {
        setSession(userSession);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      })
  }, [])

  return {
    data: {
      session
    },
    error,
    loading
  }
}

export function withSessionHOC(Component) {
  return function Wrapper(props) {
    const router = useRouter();
    const session = useSession();

    if (!session.loading && session.error) {
      router.push('/?error=401');
    }

    const modifiedProps = {
      ...props,
      session: session.data.session
    }

    return (
      <Component {...modifiedProps} />
    )
  }
}
