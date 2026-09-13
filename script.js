import {open,readdir,readFile,mkdir,rm,rename} from 'fs/promises'
import http from 'http'
import {lookup} from 'mime-types'
import Busboy from 'busboy'
import path from 'path'

const server = http.createServer(async(req,res)=>{
    const [url,queryString] = req.url.split("?")

    if(url === '/favicon.ico'){
        res.statusCode = 404
        return res.end()
    }

    if(req.method === 'POST' && url === '/upload'){
        const uploadUrl = new URL(req.url,`http://${req.headers.host}`)
        const uploadPath = decodeURIComponent(uploadUrl.searchParams.get('path') || '/')
        const busboy = Busboy({headers:req.headers})

        busboy.on('file',async(fieldname,file,info)=>{
            const {filename} = info
            const filehandle = await open(`./storage${uploadPath}/${filename}`,'w')
            const writestream = filehandle.createWriteStream()
            file.pipe(writestream)

            file.on('end',async()=>{
                await filehandle.close()
            })
        })

        busboy.on('finish',()=>{
            res.writeHead(302,{Location:uploadPath})
            res.end()
        })

        req.pipe(busboy)
        return
    }

    if(req.method === 'POST' && url === '/create-folder'){
        const body = []

        req.on('data',chunk=>body.push(chunk))
        req.on('end',async()=>{
            try{
                const data = Buffer.concat(body).toString()
                const params = new URLSearchParams(data)
                const folderName = params.get('folderName')
                const folderPath = params.get('path') || '/'

                if(!folderName) return res.end("Folder name is required")

                await mkdir(`./storage${folderPath}/${folderName}`)
                res.writeHead(302,{Location:folderPath})
                res.end()
            }catch(err){
                console.log("Folder error:",err.message)
                res.statusCode = 500
                res.end("Folder create failed")
            }
        })
        return
    }

    if(req.method === 'POST' && url === '/rename'){
        const body = []

        req.on('data',chunk=>body.push(chunk))
        req.on('end',async()=>{
            try{
                const data = Buffer.concat(body).toString()
                const params = new URLSearchParams(data)
                const oldName = params.get('oldName')
                const newName = params.get('newName')
                const folderPath = params.get('path') || '/'

                await rename(
                    `./storage${folderPath}/${oldName}`,
                    `./storage${folderPath}/${newName}`
                )

                res.writeHead(302,{Location:folderPath})
                res.end()
            }catch(err){
                console.log("Rename error:",err.message)
                res.statusCode = 500
                res.end("Rename failed")
            }
        })
        return
    }

    if(req.method === 'GET' && url === '/search'){
        const searchUrl = new URL(req.url,`http://${req.headers.host}`)
        const query = searchUrl.searchParams.get('q') || ''
        const results = []

        async function searchFolder(folderPath){
            const items = await readdir(folderPath,{withFileTypes:true})

            for(const item of items){
                const fullPath = path.join(folderPath,item.name)

                if(item.name.toLowerCase().includes(query.toLowerCase())){
                    results.push(fullPath)
                }

                if(item.isDirectory()){
                    await searchFolder(fullPath)
                }
            }
        }

        try{
            await searchFolder('./storage')

            let dynamicHTML = `
                <div style="padding:20px;border-bottom:1px solid #eee">
                    <h2>🔍 Search results for: "${query}"</h2>
                </div>
            `

            for(const result of results){
                const relativePath = result.replace('./storage','').replaceAll('\\','/')
                const name = path.basename(result)
                const itemHandle = await open(result)
                const stats = await itemHandle.stat()

                if(stats.isDirectory()){
                    dynamicHTML += `
                        <div class="file-row">
                            <div class="file-name">
                                <span class="icon">📁</span>
                                <span>${name}</span>
                            </div>
                            <div>Folder</div>
                            <div class="actions-area">
                                <a class="action" href="${relativePath}">📂 Open</a>
                                <a class="action delete" href="${relativePath}?action=delete" onclick="return confirm('Delete this folder?')">🗑️ Delete</a>
                                <form action="/rename" method="POST" class="rename-form">
                                    <input type="hidden" name="oldName" value="${name}">
                                    <input type="hidden" name="path" value="${path.dirname(relativePath)}">
                                    <input type="text" name="newName" placeholder="New name" required>
                                    <button type="submit">✏️</button>
                                </form>
                            </div>
                        </div>
                    `
                }else{
                    dynamicHTML += `
                        <div class="file-row">
                            <div class="file-name">
                                <span class="icon">📄</span>
                                <span>${name}</span>
                            </div>
                            <div>File</div>
                            <div class="actions-area">
                                <a class="action" href="${relativePath}">👁️ Open</a>
                                <a class="action" href="${relativePath}?action=Download">⬇️ Download</a>
                                <a class="action delete" href="${relativePath}?action=delete" onclick="return confirm('Delete this file?')">🗑️ Delete</a>
                                <form action="/rename" method="POST" class="rename-form">
                                    <input type="hidden" name="oldName" value="${name}">
                                    <input type="hidden" name="path" value="${path.dirname(relativePath)}">
                                    <input type="text" name="newName" placeholder="New name" required>
                                    <button type="submit">✏️</button>
                                </form>
                            </div>
                        </div>
                    `
                }

                await itemHandle.close()
            }

            if(results.length === 0){
                dynamicHTML += `
                    <div style="padding:60px;text-align:center;color:#9ca3af">
                        <div style="font-size:50px">🔍</div>
                        <h3>No results found</h3>
                    </div>
                `
            }

            const htmlboilerplate = await readFile('./boilerplate.html','utf-8')
            const html = htmlboilerplate
                .replace("${dynamicHTML}",dynamicHTML)
                .replace("${uploadPath}","/upload?path=/")
                .replace("${url}","/")
                .replace("${navigation}",`<a href="/">🏠 Home</a>`)

            res.end(html)
        }catch(err){
            console.log("Search error:",err.message)
            res.statusCode = 500
            res.end("Search failed")
        }

        return
    }

    if(url === '/'){
        await serveDirectory(url,res)
        return
    }

    try{
        const filePath = `./storage${decodeURIComponent(url)}`
        const filehandle = await open(filePath)
        const stats = await filehandle.stat()

        if(stats.isDirectory()){
            await serveDirectory(url,res)
        }else{
            const readstream = filehandle.createReadStream()
            const contentType = lookup(url)

            if(contentType){
                res.setHeader("Content-Type",contentType)
            }

            if(queryString === "action=Download"){
                const filename = decodeURIComponent(url).split('/').pop()
                res.setHeader("Content-Disposition",`attachment; filename="${filename}"`)
            }

            readstream.pipe(res)
        }
    }catch(err){
        console.log(err.message)
        res.statusCode = 404
        res.end("Not Found")
    }
})

async function serveDirectory(url,res){
    const itemlist = await readdir(`./storage${decodeURIComponent(url)}`)
    const uploadPath = `/upload?path=${encodeURIComponent(url)}`
    let dynamicHTML = ''

    if(url !== '/'){
        dynamicHTML += `
            <div class="navigation">
                <a href="${path.dirname(url)}">⬅️ Back</a>
                <a href="/">🏠 Home</a>
            </div>
        `
    }

    for(const item of itemlist){
        const itemPath = `./storage${url === '/' ? '' : url}/${item}`
        const itemHandle = await open(itemPath)
        const stats = await itemHandle.stat()
        const itemUrl = `${url === '/' ? '' : url}/${encodeURIComponent(item)}`

        if(stats.isDirectory()){
            dynamicHTML += `
                <div class="file-row">
                    <div class="file-name">
                        <span class="icon">📁</span>
                        <span>${item}</span>
                    </div>
                    <div>Folder</div>
                    <div class="actions-area">
                        <a class="action" href="${itemUrl}">📂 Open</a>
                        <a class="action delete" href="${itemUrl}?action=delete" onclick="return confirm('Delete this folder?')">🗑️ Delete</a>
                        <form action="/rename" method="POST" class="rename-form">
                            <input type="hidden" name="oldName" value="${item}">
                            <input type="hidden" name="path" value="${url}">
                            <input type="text" name="newName" placeholder="New name" required>
                            <button type="submit">✏️</button>
                        </form>
                    </div>
                </div>
            `
        }else{
            dynamicHTML += `
                <div class="file-row">
                    <div class="file-name">
                        <span class="icon">📄</span>
                        <span>${item}</span>
                    </div>
                    <div>File</div>
                    <div class="actions-area">
                        <a class="action" href="${itemUrl}">👁️ Open</a>
                        <a class="action" href="${itemUrl}?action=Download">⬇️ Download</a>
                        <a class="action delete" href="${itemUrl}?action=delete" onclick="return confirm('Delete this file?')">🗑️ Delete</a>
                        <form action="/rename" method="POST" class="rename-form">
                            <input type="hidden" name="oldName" value="${item}">
                            <input type="hidden" name="path" value="${url}">
                            <input type="text" name="newName" placeholder="New name" required>
                            <button type="submit">✏️</button>
                        </form>
                    </div>
                </div>
            `
        }

        await itemHandle.close()
    }

    if(itemlist.length === 0){
        dynamicHTML += `
            <div style="padding:60px;text-align:center;color:#9ca3af">
                <div style="font-size:50px">📂</div>
                <h3>This folder is empty</h3>
                <p style="margin-top:8px">Upload a file or create a new folder</p>
            </div>
        `
    }

    const htmlboilerplate = await readFile('./boilerplate.html','utf-8')
    const html = htmlboilerplate
        .replace("${dynamicHTML}",dynamicHTML)
        .replace("${uploadPath}",uploadPath)
        .replace("${url}",url)
        .replace("${navigation}",'')

    res.end(html)
}

server.listen(4000,'0.0.0.0',()=>{
    console.log("Server running on http://localhost:4000")
})