import { stripIndent } from 'common-tags';
import type { Request, Response } from 'express';
import { Route, RouteOptions } from '@tyman/modulo';

@RouteOptions({
    path: '/docs',
    spec: null
})
export default class Docs extends Route {
    public override async get(req: Request, res: Response) {
        res.contentType('text/html');
        res.send(stripIndent`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>API Docs</title>
                <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js" charset="UTF-8"></script>
                <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
                <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css">
            </head>
            
            <body>
                <div id="swagger-ui"></div>
                
                <script>
                    window.onload = function() {
                        const ui = SwaggerUIBundle({
                            url: "/openapi.json",
                            dom_id: '#swagger-ui',
                            deepLinking: true,
                            presets: [
                            SwaggerUIBundle.presets.apis
                            ]
                        });
                        window.ui = ui;
                    };
                </script>
            </body>
            </html>
        `);
    }
}