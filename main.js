define([
    "require",
    "jquery",
    "base/js/namespace",
    "./snippets_submenu_python",
    "./snippets_submenu_markdown",
], function (require, $, Jupyter, python, markdown) {
    "use strict";

    var mod_name = 'snippets_menu';
    var mod_log_prefix = mod_name + '[' + mod_name + ']';

    var python_menus = [
        python.numpy,
        python.scipy,
        python.matplotlib,
        python.sympy,
        python.pandas,
        python.astropy,
        python.h5py,
        python.numba,
        python.python,
    ];

    var default_menus = [
        {
            'name' : 'Snippets',
            'sub-menu-direction' : 'left',
            'sub-menu' : python_menus.concat([markdown]),
        },
    ];
    var options = {
        sibling: undefined, // if undefined, set by cfg.sibling_selector
        menus : [],
        hooks: {
            pre_config: undefined,
            post_config: undefined,
        }
    };

    var includable_submenu_keys = [
        "numpy",
        "scipy",
        "matplotlib",
        "sympy",
        "pandas",
        "astropy",
        "h5py",
        "numba",
        "python",
        "markdown",
    ];
    // default parameters
    var cfg = {
        insert_as_new_cell: false,
        insert_before_sibling: false,
        include_custom_menu: true,
        include_submenu: {}, // default set after this definition
        sibling_selector: '#help_menu',
        top_level_submenu_goes_left: true,
        custom_menu_content: JSON.stringify([{
            "name" : "My favorites",
            "sub-menu" : [{
                "name" : "Menu item text",
                "snippet" : [
                    "import something",
                    "",
                    "new_command(3.14)",
                    "other_new_code_on_new_line('with a string!')",
                    "stringy(\"if you need them, escape double quotes with a single backslash\")",
                    "backslashy('This \\ appears as just one backslash in the output')",
                    "backslashy2('Here \\\\ are two backslashes')"
                ]}, {
                    "name" : "TeX can be written in menu labels $\\alpha_W e\\int_0 \\mu \\epsilon$",
                    "snippet" : [
                        "another_new_command(2.78)"
                    ]
                }
            ]
        }])
    };
    for (var ii=0; ii< includable_submenu_keys.length; ii++) {
        cfg.include_submenu[includable_submenu_keys[ii]] = true;
    }

    function config_loaded_callback () {
        if (options['pre_config_hook'] !== undefined) {
            options['pre_config_hook']();
        }

        // true => deep
        cfg = $.extend(true, cfg, Jupyter.notebook.config.data.snippets);

        if (cfg.insert_as_new_cell) {
            console.log(mod_log_prefix, "Insertions will insert new cell");
        }

        // If `options.menus` had elements added in custom.js, skip all of this and ignore all remaining options
        if (options.menus.length > 0) {
            console.log(mod_log_prefix, '`options.menus` was created in custom.js; skipping all other configuration.');
        }
        else {
            options.menus = [
                {
                    'name' : 'Snippets',
                    'sub-menu-direction' : cfg.top_level_submenu_goes_left ? 'left' : 'right',
                    'sub-menu' : [],
                },
            ];

            for (var ii=0; ii < includable_submenu_keys.length; ii++) {
                var key = includable_submenu_keys[ii];
                if (cfg.include_submenu[key]) {
                    console.log(mod_log_prefix,
                                "Snippets: Inserting default", key, "sub-menu");
                    options.menus[0]['sub-menu'].push(key === "markdown" ? markdown : python[key]);
                }
            }
        }

        if (options.hooks.post_config !== undefined) {
            options.hooks.post_config();
        }

        // select correct sibling
        if (options.sibling === undefined) {
            options.sibling = $(cfg.sibling_selector).parent();
            if (options.sibling.length < 1) {
                options.sibling = $("#help_menu").parent();
            }
        }
        // Parse and insert the menu items
        menu_setup(options.menus, options.sibling, cfg.insert_before_sibling);

    }

    function insert_snippet_code (snippet_code) {
        if (cfg.insert_as_new_cell) {
            var new_cell = Jupyter.notebook.insert_cell_above('code');
            new_cell.set_text(snippet_code);
            new_cell.focus_cell();
        }
        else {
            var selected_cell = Jupyter.notebook.get_selected_cell();
            Jupyter.notebook.edit_mode();
            selected_cell.code_mirror.replaceSelection(snippet_code, 'around');
        }
    }

    function callback_insert_snippet (evt) {
        // this (or event.currentTarget, see below) always refers to the DOM
        // element the listener was attached to - see
        // http://stackoverflow.com/questions/12077859
        insert_snippet_code($(evt.currentTarget).data('snippet-code'));
    }

    function build_menu_element (menu_item_spec, direction) {
        // Create the menu item html element
        var element = $('<li/>');

        if (typeof menu_item_spec == 'string') {
            if (menu_item_spec != '---') {
                console.log(mod_log_prefix,
                    'Don\'t understand sub-menu string "' + menu_item_spec + '"');
                return null;
            }
            return element.addClass('divider');
        }

        var a = $('<a/>')
            .attr('href', '#')
            .html(menu_item_spec.name)
            .appendTo(element);
        if (menu_item_spec.hasOwnProperty('snippet')) {
            var snippet = menu_item_spec.snippet;
            if (typeof snippet == 'string' || snippet instanceof String) {
                snippet = [snippet];
            }
            a.attr({
                'title' : "", // Do not remove this, even though it's empty!
                'data-snippet-code' : snippet.join('\n'),
            })
            .on('click', callback_insert_snippet)
            .addClass('snippet');
        }
        else if (menu_item_spec.hasOwnProperty('internal-link')) {
            a.attr('href', menu_item_spec['internal-link']);
        }
        else if (menu_item_spec.hasOwnProperty('external-link')) {
            a.attr({
                'target' : '_blank',
                'title' : 'Opens in a new window',
            });
            $('<i class="fa fa-external-link menu-icon pull-right"/>').appendTo(a);
            $('<span/>').html(menu_item_spec.name).appendTo(a);
        }

        if (menu_item_spec.hasOwnProperty('sub-menu')) {
            element
                .addClass('dropdown-submenu')
                .toggleClass('dropdown-submenu-left', direction === 'left');
            var sub_element = $('<ul class="dropdown-menu/>')
                .toggleClass('dropdown-menu-compact', menu_item_spec.overlay === true) // For space-saving menus
                .appendTo(element);

            var new_direction = (menu_item_spec['sub-menu-direction'] === 'left') ? 'left' : 'right';
            for (var j=0; j<menu_item_spec['sub-menu'].length; ++j) {
                var sub_menu_item_spec = build_menu_element(menu_item_spec['sub-menu'][j], new_direction);
                if(sub_menu_item_spec !== null) {
                    sub_menu_item_spec.appendTo(sub_element);
                }
            }
        }

        return element;
    }

    function menu_setup (menu_items, sibling, insert_before_sibling) {
        if (insert_before_sibling === undefined) {
            insert_before_sibling = cfg.insert_before_sibling;
        }

        for (var i=0; i<menu_items.length; ++i) {
            var menu_item;
            if (insert_before_sibling) {
                menu_item = menu_items[i];
            } else {
                menu_item = menu_items[menu_items.length-1-i];
            }
            var direction = 'right';
            var node;

            if ($(sibling).parent().is('ul.nav.navbar-nav')) {
                // We need special properties if this item is in the navbar
                node = $('<li/>').addClass('dropdown');
                $('<a/>', {
                    'href' : '#',
                    'class' : 'dropdown-toggle',
                    'data-toggle' : 'dropdown',
                    'aria-expanded' : 'false',
                    'html' : menu_item.name,
                }).appendTo(node);
                var dropdown = $('<ul/>').addClass('dropdown-menu');
                direction = (menu_item['sub-menu-direction'] == 'left') ? 'left' : direction;
                for(var j=0; j<menu_item['sub-menu'].length; ++j) {
                    var sub_menu = build_menu_element(menu_item['sub-menu'][j], direction);
                    if(sub_menu !== null) {
                        sub_menu.appendTo(dropdown);
                    }
                }
                dropdown.appendTo(node);
            } else {
                // Assume this is inside some other menu in the navbar
                direction = (menu_item['menu-direction'] == 'left') ? 'left' : direction;
                node = build_menu_element(menu_item, direction);
            }

            // Insert the menu
            if (insert_before_sibling) {
                node.insertBefore(sibling);
            } else {
                node.insertAfter(sibling);
            }

            // Make sure MathJax will typeset this menu
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, node[0]]);
        }
    }

    var load_ipython_extension = function () {
        // Add our css to the notebook's head
        $('<link/>', {
            rel: 'stylesheet',
            type:'text/css',
            href: require.toUrl('./snippets_menu.css')
        }).appendTo('head');

        // Arrange the menus as given by the configuration
        Jupyter.notebook.config.loaded.then(config_loaded_callback);
    };

    return {
        // Handy functions
        load_ipython_extension : load_ipython_extension,
        menu_setup : menu_setup,

        // Default menus
        python : python,
        python_menus : python_menus,
        markdown : markdown,
        default_menus : default_menus,

        // Items that could be useful for customization
        options : options,
    };

});
