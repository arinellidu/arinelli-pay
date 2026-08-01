package br.com.arinelli.pay.billing.contracts;

import br.com.arinelli.pay.billing.clients.Client;
import br.com.arinelli.pay.billing.clients.ClientNotFoundException;
import br.com.arinelli.pay.billing.clients.ClientRepository;
import br.com.arinelli.pay.billing.invoices.DueDateRule;
import br.com.arinelli.pay.billing.invoices.Invoice;
import br.com.arinelli.pay.billing.invoices.InvoiceRepository;
import br.com.arinelli.pay.billing.invoices.InvoiceStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class ContractService {

    private final ContractRepository contracts;
    private final ClientRepository clients;
    private final InvoiceRepository invoices;

    public ContractService(ContractRepository contracts, ClientRepository clients, InvoiceRepository invoices) {
        this.contracts = contracts;
        this.clients = clients;
        this.invoices = invoices;
    }

    @Transactional
    public ContractResponse create(ContractRequest request) {
        Client client = clients.findById(request.clientId())
                .orElseThrow(() -> new ClientNotFoundException(request.clientId()));
        // I3: escala 2 com arredondamento explícito (fraction<=2 já garantido pelo @Digits)
        Contract contract = new Contract(
                client,
                request.title().trim(),
                request.amount().setScale(2, RoundingMode.HALF_UP),
                request.billingDay());
        return toResponse(contracts.saveAndFlush(contract));
    }

    @Transactional(readOnly = true)
    public List<ContractResponse> list(Long clientId) {
        List<Contract> found = clientId == null
                ? contracts.findAllByOrderById()
                : contracts.findByClientIdOrderById(clientId);
        return found.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ContractResponse get(Long id) {
        Contract contract = contracts.findWithClientById(id)
                .orElseThrow(() -> new ContractNotFoundException(id));
        return toResponse(contract);
    }

    private ContractResponse toResponse(Contract contract) {
        LocalDate latestDue = invoices
                .findTopByContractIdAndStatusNotOrderByDueDateDesc(contract.getId(), InvoiceStatus.CANCELED)
                .map(Invoice::getDueDate)
                .orElse(null);
        LocalDate nextDue = contract.getStatus() == ContractStatus.ACTIVE
                ? DueDateRule.nextDueDate(LocalDate.now(), contract.getBillingDay(), latestDue)
                : null;
        return ContractResponse.from(contract, nextDue);
    }
}
