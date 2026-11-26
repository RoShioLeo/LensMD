package run.halo.bytemd;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

/** Shares the editor's extension styles with rendered posts and pages. */
@Component
public class MarkdownExtensionsHeadProcessor implements TemplateHeadProcessor {
    private final String style;

    public MarkdownExtensionsHeadProcessor() throws IOException {
        var resource = new ClassPathResource("markdown-extensions.css", getClass().getClassLoader());
        style = "<style data-markdown-extensions>"
            + resource.getContentAsString(StandardCharsets.UTF_8) + "</style>";
    }

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
                             IElementModelStructureHandler structureHandler) {
        model.add(context.getModelFactory().createText(style));
        return Mono.empty();
    }
}
