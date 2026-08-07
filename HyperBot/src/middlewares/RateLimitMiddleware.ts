import {
    Request,
    Response,
    NextFunction
} from "express";

type RateLimitEntry={

    requests:number;

    resetAt:number;

};

export class RateLimitMiddleware{

    private static readonly cache=

        new Map<string,RateLimitEntry>();

    public static limit(

        maxRequests:number,

        windowMs:number

    ){

        return(

            request:Request,

            response:Response,

            next:NextFunction

        ):void=>{

            const key=

                request.ip||

                "unknown";

            const now=

                Date.now();

            let entry=

                this.cache.get(

                    key

                );

            if(

                !entry||

                now>=entry.resetAt

            ){

                entry={

                    requests:0,

                    resetAt:

                        now+

                        windowMs

                };

            }

            entry.requests++;

            this.cache.set(

                key,

                entry

            );

            response.setHeader(

                "X-RateLimit-Limit",

                maxRequests

            );

            response.setHeader(

                "X-RateLimit-Remaining",

                Math.max(

                    0,

                    maxRequests-

                    entry.requests

                )

            );

            response.setHeader(

                "X-RateLimit-Reset",

                entry.resetAt

            );

            if(

                entry.requests>

                maxRequests

            ){

                response.status(

                    429

                ).json({

                    success:false,

                    message:

                        "Too many requests. Please try again later."

                });

                return;

            }

            next();

        };

    }

    public static clear():void{

        this.cache.clear();

    }

}
