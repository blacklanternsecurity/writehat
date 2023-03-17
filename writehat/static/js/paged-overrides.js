function removeEmpty(e, page_id) {
    if (e.text().trim().length == 0) {
        console.debug("Removing empty element from " + page_id + ": ");
        console.debug(e);

        p = e.parent();
        e.remove();

        if (p.is("table")) {
            let c = p.clone(), h = c.children("thead");
            h.remove();
            if (c.text().trim().length == 0) {
                console.debug("Removing empty table from " + page_id + ": ");
                console.debug(p);
                p.remove();
            }
        }
    }

}

let last_node = false, last_thead = false, last_tr = false;
class ElementCleaner extends Paged.Handler {

    constructor(chunker, polisher, caller) {
        super(chunker, polisher, caller);
    }

    afterParsed(parsed) {
        $("#report-body > div.pagedjs_pages").css("justify-content", "center");
    }

    afterPageLayout(pageElement, page, breakToken) {
        const cleanup = [ 
            ".generated-table table", 
            ".finding-content pre",
            "tbody",
            "ul",
            "ol"
        ];

        cleanup.forEach( e => $(page.element).find(e).each( function() { removeEmpty($(this), page.id); } ) );
    }

    afterRendered(pages) {
        for (let i = 0; i < pages.length; i++) {
            let page = $(pages[i].element)
            let split_to = page.find('.finding-content[data-split-to]')

            if (split_to.length > 0) {
                let body = split_to.find('.finding-content-body')
                let header = split_to.find('.finding-content-header')

                let split_id = split_to.attr('data-split-to')
                let next_page = $(pages[i + 1].element)

                let split_from = next_page.find(`.finding-content[data-split-from='${split_id}']`)

                split_from.prepend(header.clone())

                if (body.text().length == 0) {
                    split_to.remove()
                }
            }
        }

        let t1 = performance.now();
        console.log("Rendering took " + Number.parseFloat((t1 - t0)/1000).toPrecision(3) + " seconds.");

        $("<input type='hidden' value='1' id='finished_loading' />").appendTo("html");
        console.log($("#finished_loading"));
    }

    renderNode(node, sourceNode, layout) {
        // Handle numbered lists that are split by code blocks
        if ($(node).is("pre") && $(node).prev().is("ol")) {
            let p = $(node).prev();
            let l = p.children("li:last-child");
            $(node).appendTo(l);
        } else if ($(node).is("li") && $(node).parent().is("ol") && $(node).parent().prev().is("ol")) {
            let p_orig = $(node).parent();
            let p = $(node).parent().prev();
            $(node).appendTo(p);
            if ($(sourceNode).is(":last-child")) {
                p_orig.remove();
            }
        }

        if (last_node) {
            // Special handling for split tables: clone sibling <td> elements
            if (last_tr) {
                if ($(node).parent().is("td")) {
                    let split_from = $(node).parent().attr("data-split-from");
                    let last_td = $(last_tr).children("td[data-ref=" + split_from + "]");
                    let new_td = $(node).closest("td");
                    let new_tbody = new_td.closest("tbody");

                    // Add split content back to prior <td>, then append the
                    // prior <td> to the new table
                    last_td.html(last_td.html() + new_td.html());
                    new_tbody.html(last_tr);
                    last_tr = false;

                    $(new_tbody).closest("table").prepend(last_thead.clone());
                    last_thead = false;
                }
            }

            let comp = last_node;
            if ($(node).is("tbody")) {
                comp = $(node).parent();
            }

            if ($(last_node).attr("data-ref") == $(comp).attr("data-ref")) {
                if (last_thead) {
                    console.debug("Prepending last thead to split table");
                    $(node).closest("table").prepend(last_thead.clone());
                    last_thead = false;
                }

                console.debug($(node).closest("table"));
                if ($(last_node).is("td") || $(last_node).parent().is("td")) {
                    let tr = $(last_node).closest("tr"), tbody = tr.parent();
                    if (tr.text().trim().length == 0) {
                        console.debug("Removing empty row from split table");
                        tr.remove();
                        tbody.css("transform", "translateZ(0)"); // Force CSS redraw
                    }
                }
                last_node = false;
            }
        }
    }

    onBreakToken(breakToken, overflow, rendered) {
        if (overflow) {
            let sc = $(overflow.startContainer)[0];
            if ($(sc).is("td") || $(sc).parent().is("td") || $(sc).is("tbody")) {
                let table = $(sc).closest("table");
                if (table.parent().is(".generated-table")) {
                    console.debug("Page break in .generated-table; storing last thead element");
                    last_thead = $(table).children("thead");
                    if ($(sc).is("tbody")) {
                        last_node = table;
                    } else {
                        last_node = sc;
                        try {
                            last_tr = sc.closest("tr");
                        } catch (e) {
                            if (e instanceof TypeError &&
                                e.toString() === "TypeError: sc.closest is not a function" &&
                                sc.nodeType == Node.TEXT_NODE
                            ) {
                                last_tr = sc.parentNode.closest("tr")
                            } else {
                                throw e
                            }
                        }
                    }
                }
            }
        }
    }
}

Paged.registerHandlers(ElementCleaner);

let t0 = performance.now();
$().ready( function() { 
	let flowText = document.querySelector("#report-body");
    let t0 = performance.now();
    let paged = new Paged.Previewer()
	paged.preview(flowText.content).then((flow) => {
        hljs.highlightAll();
        let t1 = performance.now();
        console.log("Rendering " + flow.total + " pages took " + (t1 - t0) + " milliseconds.");
    })

//  let resizer = () => {
//    let pages = document.querySelector(".pagedjs_pages");

//    if (pages) {
//      let scale = ((window.innerWidth * .9 ) / pages.offsetWidth);
//      if (scale < 1) {
//        pages.style.transform = `scale(${scale}) translate(${(window.innerWidth / 2) - ((pages.offsetWidth * scale / 2) ) }px, 0)`;
//      } else {
//        pages.style.transform = "none";
//      }
//    }
//  };
//  resizer();

//  window.addEventListener("resize", resizer, false);

//  paged.on("rendering", () => {
//    resizer();
//  });
});
