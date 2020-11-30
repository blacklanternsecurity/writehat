modifiedBaseMetrics =   [{'metric':'Description','text':'These metrics enable the analyst to override individual Base metrics based on specific characteristics of a users environment. Characteristics that affect Exploitability, Scope, or Impact can be reflected via an appropriately modified Environmental Score. The full effect on the Environmental score is determined by the corresponding Base metrics. That is, these metrics modify the Environmental Score by overriding Base metric values, prior to applying the Environmental Security Requirements. For example, the default configuration for a vulnerable component may be to run a listening service with administrator privileges, for which a compromise might grant an attacker Confidentiality, Integrity, and Availability impacts that are all High. Yet, in the analyst’s environment, that same Internet service might be running with reduced privileges; in that case, the Modified Confidentiality, Modified Integrity, and Modified Availability might each be set to Low.'},
                        {'metric':'Values','text':'The same values as the corresponding Base Metric (see Base Metrics above), as well as Not Defined (the default).'}]


securityRequirements = [{'metric':'Not Defined (X)','text':'Assigning this value indicates there is insufficient information to choose one of the other values, and has no impact on the overall Environmental Score, i.e., it has the same effect on scoring as assigning Medium.'},   
                            {'metric':'High (H)','text':'Loss of [Confidentiality | Integrity | Availability] is likely to have a catastrophic adverse effect on the organization or individuals associated with the organization (e.g., employees, customers).'},
                            {'metric':'Medium (M)','text':'Loss of [Confidentiality | Integrity | Availability] is likely to have a serious adverse effect on the organization or individuals associated with the organization (e.g., employees, customers).'},
                            {'metric':'Low (L)','text':'Loss of [Confidentiality | Integrity | Availability] is likely to have only a limited adverse effect on the organization or individuals associated with the organization (e.g., employees, customers).'}]

toolTipData = { 
    'AV': {'name':'Attack Vector (AV)','metrics':[
                                                    {'metric':'Network (N)','text':'The vulnerable component is bound to the network stack and the set of possible attackers extends beyond the other options listed below, up to and including the entire Internet. Such a vulnerability is often termed “remotely exploitable” and can be thought of as an attack being exploitable at the protocol level one or more network hops away (e.g., across one or more routers). An example of a network attack is an attacker causing a denial of service (DoS) by sending a specially crafted TCP packet across a wide area network (e.g., CVE‑2004‑0230).'},
                                                    {'metric':'Adjacent (A)','text':'The vulnerable component is bound to the network stack, but the attack is limited at the protocol level to a logically adjacent topology. This can mean an attack must be launched from the same shared physical (e.g., Bluetooth or IEEE 802.11) or logical (e.g., local IP subnet) network, or from within a secure or otherwise limited administrative domain (e.g., MPLS, secure VPN to an administrative network zone). One example of an Adjacent attack would be an ARP (IPv4) or neighbor discovery (IPv6) flood leading to a denial of service on the local LAN segment (e.g., CVE‑2013‑6014).'},
                                                    {'metric':'Local (L)','text':'The vulnerable component is not bound to the network stack and the attacker’s path is via read/write/execute capabilities. Either: 1: the attacker exploits the vulnerability by accessing the target system locally (e.g., keyboard, console), or remotely (e.g., SSH); or 2: the attacker relies on User Interaction by another person to perform actions required to exploit the vulnerability (e.g., using social engineering techniques to trick a legitimate user into opening a malicious document).'},
                                                    {'metric':'Physical (P)','text':'The attack requires the attacker to physically touch or manipulate the vulnerable component. Physical interaction may be brief (e.g., evil maid attack[^1]) or persistent. An example of such an attack is a cold boot attack in which an attacker gains access to disk encryption keys after physically accessing the target system. Other examples include peripheral attacks via FireWire/USB Direct Memory Access (DMA).'}
                                                ]},
    'AC': {'name':'Attack Complexity (AC)','metrics':[
                                                    {'metric':'Low (L)','text':'Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success when attacking the vulnerable component.'},
                                                    {'metric':'High (H)','text':'A successful attack depends on conditions beyond the attackers control. That is, a successful attack cannot be accomplished at will, but requires the attacker to invest in some measurable amount of effort in preparation or execution against the vulnerable component before a successful attack can be expected. For example, a successful attack may depend on an attacker overcoming any of the following conditions: 1: The attacker must gather knowledge about the environment in which the vulnerable target/component exists. For example, a requirement to collect details on target configuration settings, sequence numbers, or shared secrets. 2: The attacker must prepare the target environment to improve exploit reliability. For example, repeated exploitation to win a race condition, or overcoming advanced exploit mitigation techniques. 3: The attacker must inject themselves into the logical network path between the target and the resource requested by the victim in order to read and/or modify network communications (e.g., a man in the middle attack).'},
                                                ]},
    'PR': {'name':'Privileges Required (PR)','metrics':[
                                                    {'metric':'None (N)','text':'The attacker is unauthorized prior to attack, and therefore does not require any access to settings or files of the the vulnerable system to carry out an attack.'},
                                                    {'metric':'Low (L)','text':'The attacker requires privileges that provide basic user capabilities that could normally affect only settings and files owned by a user. Alternatively, an attacker with Low privileges has the ability to access only non-sensitive resources.'},
                                                    {'metric':'High (H)','text':'The attacker requires privileges that provide significant (e.g., administrative) control over the vulnerable component allowing access to component-wide settings and files.'}
                                                ]},
    'UI': {'name':'User Interaction (UI)','metrics':[
                                                    {'metric':'None (N)','text':'The vulnerable system can be exploited without interaction from any user.'},
                                                    {'metric':'Required (R)','text':'Successful exploitation of this vulnerability requires a user to take some action before the vulnerability can be exploited. For example, a successful exploit may only be possible during the installation of an application by a system administrator.'}
                                                ]},
    'S': {'name':'Scope (S)','metrics':[
                                                    {'metric':'Unchanged (U)','text':'An exploited vulnerability can only affect resources managed by the same security authority. In this case, the vulnerable component and the impacted component are either the same, or both are managed by the same security authority.'},
                                                    {'metric':'Changed (C)','text':'An exploited vulnerability can affect resources beyond the security scope managed by the security authority of the vulnerable component. In this case, the vulnerable component and the impacted component are different and managed by different security authorities.'}
                                                ]},
    'C': {'name':'Confidentiality','metrics':[
                                                    {'metric':'High (H)','text':'There is a total loss of confidentiality, resulting in all resources within the impacted component being divulged to the attacker. Alternatively, access to only some restricted information is obtained, but the disclosed information presents a direct, serious impact. For example, an attacker steals the administrator\'s password, or private encryption keys of a web server.'},
                                                    {'metric':'Low (L)','text':'There is some loss of confidentiality. Access to some restricted information is obtained, but the attacker does not have control over what information is obtained, or the amount or kind of loss is limited. The information disclosure does not cause a direct, serious loss to the impacted component.'},
                                                    {'metric':'None (N)','text':'There is no loss of confidentiality within the impacted component.'}
                                                ]},
    'I': {'name':'Integrity','metrics':[
                                                    {'metric':'High (H)','text':'There is a total loss of integrity, or a complete loss of protection. For example, the attacker is able to modify any/all files protected by the impacted component. Alternatively, only some files can be modified, but malicious modification would present a direct, serious consequence to the impacted component.'},
                                                    {'metric':'Low (L)','text':'Modification of data is possible, but the attacker does not have control over the consequence of a modification, or the amount of modification is limited. The data modification does not have a direct, serious impact on the impacted component.'},
                                                    {'metric':'None (N)','text':'There is no loss of integrity within the impacted component.'}                                                    
                                                ]},
    'A': {'name':'Availability (A)','metrics':[
                                                    {'metric':'High (H)','text':'There is a total loss of availability, resulting in the attacker being able to fully deny access to resources in the impacted component; this loss is either sustained (while the attacker continues to deliver the attack) or persistent (the condition persists even after the attack has completed). Alternatively, the attacker has the ability to deny some availability, but the loss of availability presents a direct, serious consequence to the impacted component (e.g., the attacker cannot disrupt existing connections, but can prevent new connections; the attacker can repeatedly exploit a vulnerability that, in each instance of a successful attack, leaks a only small amount of memory, but after repeated exploitation causes a service to become completely unavailable).'},
                                                    {'metric':'Low (L)','text':'Performance is reduced or there are interruptions in resource availability. Even if repeated exploitation of the vulnerability is possible, the attacker does not have the ability to completely deny service to legitimate users. The resources in the impacted component are either partially available all of the time, or fully available only some of the time, but overall there is no direct, serious consequence to the impacted component.'},
                                                    {'metric':'None (N)','text':'There is no impact to availability within the impacted component.'}    
                                            
                                                ]},
    'E': {'name':'Exploit Code Maturity  (E)','metrics':[
                                                    {'metric':'Not Defined (X)','text':'Assigning this value indicates there is insufficient information to choose one of the other values, and has no impact on the overall Temporal Score, i.e., it has the same effect on scoring as assigning High.'},
                                                    {'metric':'High (H)','text':'Functional autonomous code exists, or no exploit is required (manual trigger) and details are widely available. Exploit code works in every situation, or is actively being delivered via an autonomous agent (such as a worm or virus). Network-connected systems are likely to encounter scanning or exploitation attempts. Exploit development has reached the level of reliable, widely available, easy-to-use automated tools.'},
                                                     {'metric':'Functional (F)','text':'Functional exploit code is available. The code works in most situations where the vulnerability exists.'},
                                                    {'metric':'Proof-of-Concept (P)','text':'Proof-of-concept exploit code is available, or an attack demonstration is not practical for most systems. The code or technique is not functional in all situations and may require substantial modification by a skilled attacker.'},    
                                                      {'metric':'None (N)','text':'No exploit code is available, or an exploit is theoretical.'}                                                       
                                                ]},
    'RL': {'name':'Remediation Level (RL)','metrics':[
                                                    {'metric':'High (H)','text':'Specialized access conditions or extenuating circumstances do not exist. An attacker can expect repeatable success when attacking the vulnerable component.'},
                                                    {'metric':'Low (L)','text':'A successful attack depends on conditions beyond the attackers control. That is, a successful attack cannot be accomplished at will, but requires the attacker to invest in some measurable amount of effort in preparation or execution against the vulnerable component before a successful attack can be expected. For example, a successful attack may depend on an attacker overcoming any of the following conditions: 1: The attacker must gather knowledge about the environment in which the vulnerable target/component exists. For example, a requirement to collect details on target configuration settings, sequence numbers, or shared secrets. 2: The attacker must prepare the target environment to improve exploit reliability. For example, repeated exploitation to win a race condition, or overcoming advanced exploit mitigation techniques. 3: The attacker must inject themselves into the logical network path between the target and the resource requested by the victim in order to read and/or modify network communications (e.g., a man in the middle attack).'}
                                                ]},
    'RC': {'name':'Report Confidence (RC)','metrics':[
                                                    {'metric':'Not Defined (X)','text':'Overall Temporal Score, i.e., it has the same effect on scoring as assigning Confirmed.'},
                                                    {'metric':'Confirmed (C)','text':'Detailed reports exist, or functional reproduction is possible (functional exploits may provide this). Source code is available to independently verify the assertions of the research, or the author or vendor of the affected code has confirmed the presence of the vulnerability.'},
                                                    {'metric':'Reasonable (R)','text':'Significant details are published, but researchers either do not have full confidence in the root cause, or do not have access to source code to fully confirm all of the interactions that may lead to the result. Reasonable confidence exists, however, that the bug is reproducible and at least one impact is able to be verified (proof-of-concept exploits may provide this). An example is a detailed write-up of research into a vulnerability with an explanation (possibly obfuscated or “left as an exercise to the reader”) that gives assurances on how to reproduce the results.'},
                                                    {'metric':'Unknown (U)','text':'There are reports of impacts that indicate a vulnerability is present. The reports indicate that the cause of the vulnerability is unknown, or reports may differ on the cause or impacts of the vulnerability. Reporters are uncertain of the true nature of the vulnerability, and there is little confidence in the validity of the reports or whether a static Base Score can be applied given the differences described. An example is a bug report which notes that an intermittent but non-reproducible crash occurs, with evidence of memory corruption suggesting that denial of service, or possible more serious impacts, may result.'}
                                                ]},

    'CR': {'name':'Confidentiality Requirement (CR)','metrics':securityRequirements},
    'IR': {'name':'Integrity Requirement (IR)','metrics':securityRequirements},
    'AR': {'name':'Availability Requirement (PR)','metrics':securityRequirements},



    'MAV': {'name':'Modified Attack Vector (MAV)','metrics': modifiedBaseMetrics},
    'MAC': {'name':'Modified Attack Complexity (MAC)','metrics': modifiedBaseMetrics},
    'MPR': {'name':'Modified Privileges Required (MPR)','metrics': modifiedBaseMetrics},
    'MUI': {'name':'Modified User Interaction (MUI)','metrics': modifiedBaseMetrics},
    'MS': {'name':'Modified Scope (MS)','metrics': modifiedBaseMetrics},
    'MC': {'name':'Modified Confidentiality (MC)','metrics': modifiedBaseMetrics},
    'MI': {'name':'Modified Integrity (MI)','metrics': modifiedBaseMetrics},
    'MA': {'name':'Modified Availability (MA)','metrics': modifiedBaseMetrics},


    # These definitions are not official in any way and could (should?) be updated with something better
    'damage': {
        'name':'Damage Potential','metrics': [
            {'metric':'Critical (10)','text':'An attacker can gain full access to the system; execute commands as root/administrator'},
            {'metric':'High (7)','text':'An attacker can gain non-privileged user access; leaking extremely sensitive information'},
            {'metric':'Medium (4)','text':'Sensitive information leak; Denial of Service'},
            {'metric':'Low (1)','text':'Leaking trivial information'},
            {'metric':'None (0)','text':'None'},
        ]},
    'reproducibility': {
        'name':'Reproducibility','metrics': [
            {'metric':'Critical (10)','text':'The attack can be reproduced every time and does not require a timing window'},
            {'metric':'High (7)','text':'The attack can be reproduced most of the time'},
            {'metric':'Medium (4)','text':'The attack can be reproduced, but only with a timing window'},
            {'metric':'Low (1)','text':'The attack is very difficult to reproduce, even with knowledge of the security vulnerability'},
            {'metric':'None (0)','text':'None'},
        ]},
    'exploitability': {
        'name':'Exploitability','metrics':[
            {'metric':'Critical (10)','text':'No programming skills are needed; automated exploit tools exist'},
            {'metric':'High (7)','text':'A novice hacker/programmer could execute the attack in a short time'},
            {'metric':'Medium (4)','text':'A skilled programmer could create the attack, and a novice could repeat the steps'},
            {'metric':'Low (1)','text':'The attack required a skilled person and indepth knowledge every time to exploit'},
            {'metric':'None (0)','text':'None'},
        ]},
    'affectedUsers': {
        'name':'Affected Users','metrics': [
            {'metric':'Critical (10)','text':'All users, default configuration, key customers'},
            {'metric':'High (7)','text':'Most users; common configuration'},
            {'metric':'Medium (4)','text':'Some users; nonstandard configuration'},
            {'metric':'Low (1)','text':'Very small percentage of users; obscure features; affects anonymous users'},
            {'metric':'None (0)','text':'None'},
        ]},
    'discoverability': {
        'name':'Discoverability','metrics': [
            {'metric':'Critical (10)','text':'Vulnerability can be found using automated scanning tools'},
            {'metric':'High (7)','text':'Published information explains the attack. The vulnerability is found in the most commonly used feature'},
            {'metric':'Medium (4)','text':'The vulnerability is in a seldom usedpart of the product, and few users would come across it'},
            {'metric':'Low (1)','text':'The vulnerability is obscure and it is unlikely that it would be discovered'},
            {'metric':'None (0)','text':'None'},
        ]},
    }
